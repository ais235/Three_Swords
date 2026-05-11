"""
Приводит все PNG иконок предметов к единому квадратному размеру (по умолчанию 64×64):
контент масштабируется с сохранением пропорций, центрируется на прозрачном фоне.

Обрабатывает подпапки assets/items/: weapons, armor, accessories, consumables, materials, misc.
Пропускает _source и README.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ITEMS = ROOT / "assets" / "items"
SUBDIRS = ("weapons", "armor", "accessories", "consumables", "materials", "misc")

CANVAS = 256
PADDING = 8
ALPHA_THRESHOLD = 8


def bbox_nontransparent(im: Image.Image) -> tuple[int, int, int, int] | None:
    arr = im.split()[-1]
    a = arr.load()
    w, h = im.size
    min_x, min_y = w, h
    max_x = max_y = 0
    found = False
    for y in range(h):
        for x in range(w):
            if a[x, y] > ALPHA_THRESHOLD:
                found = True
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    if not found:
        return None
    return (min_x, min_y, max_x + 1, max_y + 1)


def normalize_image(path: Path, size: int = CANVAS, pad: int = PADDING) -> bool:
    im = Image.open(path).convert("RGBA")
    box = bbox_nontransparent(im)
    if box is None:
        print(f"  skip (empty): {path.relative_to(ROOT)}")
        return False
    cropped = im.crop(box)
    cw, ch = cropped.size
    inner = size - 2 * pad
    if inner <= 0:
        raise ValueError("CANVAS too small for PADDING")
    scale = min(inner / cw, inner / ch, 1.0)
    nw = max(1, int(round(cw * scale)))
    nh = max(1, int(round(ch * scale)))
    # Качественное сжатие; апскейл не делаем — оставляем родное разрешение.
    if scale < 1.0:
        resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    else:
        resized = cropped
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ox = (size - nw) // 2
    oy = (size - nh) // 2
    out.paste(resized, (ox, oy), resized)
    out.save(path, "PNG", optimize=True)
    return True


def main() -> None:
    size = CANVAS
    if len(sys.argv) > 1:
        size = int(sys.argv[1])
    count = 0
    for sub in SUBDIRS:
        d = ITEMS / sub
        if not d.is_dir():
            continue
        for path in sorted(d.glob("*.png")):
            if normalize_image(path, size=size):
                count += 1
                print(f"  ok {path.relative_to(ROOT)}")
    print(f"Done. Normalized {count} files to {size}x{size}.")


if __name__ == "__main__":
    main()
