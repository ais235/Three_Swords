"""Сборка картинок для страницы itch из кадров, снятых make-itch-media.mjs.

    python scripts/itch-media.py gif <кадры> <out.gif>   GIF механики
    python scripts/itch-media.py art <кадры> <папка>     вставки в описание

GIF: у каждого кадра своя длительность — по времени съёмки, а не постоянная
частота: снимки приходят неровно, и ровный шаг дал бы рваную анимацию.
Одна палитра на весь клип: палитра на кадр заставляет фон мерцать. Петля
бесшовная: последние кадры плавно переходят в первый, поэтому скачка из
«вепрь убит» обратно в «вепрь стоит» глаз не видит.

Вставки: боссы и отряд — арт из assets/ на прозрачном фоне (карту снимает
make-itch-media.mjs прямо из игры), без надписей: страница двуязычная, и текст в картинке пришлось бы
рисовать дважды.
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
GIF_WIDTH = 480
GIF_LIMIT = 3_000_000  # предел редактора описания itch


def make_gif(src: Path, out: Path) -> None:
    times = json.loads((src / 'times.json').read_text())
    files = sorted(src.glob('[0-9]*.png'))
    if len(files) != len(times):
        raise SystemExit(f'кадров {len(files)}, отметок времени {len(times)}')
    # Кадры чаще 40 мс GIF всё равно не покажет: браузеры растягивают такие
    # задержки. Лишние отбрасываются, иначе ролик шёл бы медленнее игры.
    keep = [0]
    for i in range(1, len(times)):
        if times[i] - times[keep[-1]] >= 40:
            keep.append(i)
    frames, durations = [], []
    for n, i in enumerate(keep):
        nxt = times[keep[n + 1]] if n + 1 < len(keep) else times[i] + 60
        durations.append(max(40, round((nxt - times[i]) / 10) * 10))
        im = Image.open(files[i]).convert('RGB')
        h = round(im.height * GIF_WIDTH / im.width)
        frames.append(im.resize((GIF_WIDTH, h), Image.LANCZOS))

    # Бесшовная петля: шесть кадров перехода от конца к первому кадру.
    first, last = frames[0], frames[-1]
    for k in range(1, 7):
        frames.append(Image.blend(last, first, k / 7))
        durations.append(60)

    # Палитра — с трёх кадров сразу (начало, удар, конец): подсветка клеток
    # хода есть только в начале, и палитра одного среднего кадра её теряет.
    probe = [frames[0], frames[len(frames) // 2], frames[-1]]
    sheet = Image.new('RGB', (GIF_WIDTH, sum(f.height for f in probe)))
    y = 0
    for f in probe:
        sheet.paste(f, (0, y)); y += f.height
    palette = sheet.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    q = [im.quantize(palette=palette, dither=Image.Dither.NONE) for im in frames]
    q[0].save(out, save_all=True, append_images=q[1:], duration=durations, loop=0, optimize=True, disposal=1)
    size = out.stat().st_size
    print(f'{out.name}: {q[0].width}x{q[0].height}, {len(q)} кадров, {sum(durations) / 1000:.1f} с, {size / 1e6:.2f} МБ')
    if size > GIF_LIMIT:
        raise SystemExit(f'{out.name} больше 3 МБ — редактор itch его не примет')


def row_of(images, height, gap, width=630):
    """Картинки в ряд по центру полосы заданной ширины, на прозрачном фоне."""
    scaled = []
    for im in images:
        im = im.crop(im.getchannel('A').getbbox()) if im.mode == 'RGBA' else im
        scaled.append(im.resize((round(im.width * height / im.height), height), Image.LANCZOS))
    total = sum(im.width for im in scaled) + gap * (len(scaled) - 1)
    if total > width:  # не влезло — ужимаем ряд целиком
        k = width / total
        return row_of(images, int(height * k), int(gap * k), width)
    strip = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    x = (width - total) // 2
    for im in scaled:
        strip.alpha_composite(im.convert('RGBA'), (x, 0))
        x += im.width + gap
    return strip


def make_art(src: Path, out: Path) -> None:
    bosses = [Image.open(ROOT / f'assets/enemies/{n}.webp').convert('RGBA')
              for n in ('leshy', 'hydra', 'fire_titan', 'dark_lord')]
    strip = row_of(bosses, 150, 14)
    strip.save(out / 'desc-bosses.png', optimize=True)
    print(f'desc-bosses.png: {strip.width}x{strip.height}')

    squad = [Image.open(ROOT / f'assets/portraits/{n}-dialog.webp').convert('RGBA')
             for n in ('garet', 'alira', 'seris')]
    strip = row_of(squad, 220, 16)
    strip.save(out / 'desc-squad.png', optimize=True)
    print(f'desc-squad.png: {strip.width}x{strip.height}')


if __name__ == '__main__':
    mode, src, out = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
    if mode == 'gif':
        make_gif(src, out)
    elif mode == 'art':
        make_art(src, out)
    else:
        raise SystemExit(f'неизвестный режим {mode}')
