/**
 * Cut the interface kit out of the RPG GUI construction sheet.
 *
 * The sheet is a construction kit rather than a set of finished widgets, so the
 * pieces have to be located and cropped. Their coordinates were measured by
 * flood-filling the sheet's alpha channel and taking the bounding box of each
 * connected sprite, not read off by eye - see MEASURED below.
 *
 * Rarity gems are derived: the sheet has no four-colour set, so one of its own
 * gold studs is hue-rotated per rarity. CC-BY allows derivative work as long as
 * the author is credited, which assets/ui/kit/README.md does.
 *
 * They are separate 24px images rather than four rarity frames on purpose. Baking
 * the gem into a frame corner means the 9-slice inset has to clear it, and on an
 * 82px panel the gem reaches 29% of the way in - the card would need a border ten
 * times thicker on two sides than the other two, or the gem would be squashed to
 * mush. As its own element in the corner it stays crisp at natural size and the
 * frame stays one uniform slice.
 *
 * Rerunning this is how the kit is rebuilt if a piece needs changing; it is not
 * part of the build, and the sheet is not in the repository (2.9 MB, and only
 * these crops are needed).
 *
 *   node scripts/build-ui-kit.mjs <path to RPG_GUI_v1.png>
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sheet = process.argv[2];
if (!sheet || !existsSync(sheet)) {
  console.error('Укажите путь к RPG_GUI_v1.png (лист конструктора).');
  process.exit(1);
}
const outDir = resolve(root, 'assets/ui/kit');
mkdirSync(outDir, { recursive: true });

/** x, y, w, h on the sheet. Measured, not eyeballed. */
const MEASURED = {
  barDark: [13, 126, 285, 56],   // тёмная доска - обычная кнопка
  barLight: [13, 282, 285, 56],  // светлее - нажатая и наведённая
  panel: [117, 450, 82, 82],     // деревянная панель в золотой раме
  slot: [38, 487, 46, 46],       // та же панель размером с ячейку
  stud: [17, 13, 24, 24]         // золотая заклёпка - основа камня редкости
};

/** Rarity -> hue rotation applied to the stud, in degrees. 0 leaves it gold. */
const RARITY_HUE = { common: 0, rare: 200, epic: 275, secret: 340 };

const script = `
import sys, json
from PIL import Image
import colorsys

sheet_path, out_dir, spec = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
sheet = Image.open(sheet_path).convert("RGBA")
boxes, hues = spec["boxes"], spec["hues"]

def crop(name):
    x, y, w, h = boxes[name]
    return sheet.crop((x, y, x + w, y + h))

def rotate_hue(img, deg):
    if deg == 0:
        return img
    px = img.load()
    for j in range(img.height):
        for i in range(img.width):
            r, g, b, a = px[i, j]
            if a == 0:
                continue
            hh, ll, ss = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            nr, ng, nb = colorsys.hls_to_rgb(((hh * 360 + deg) % 360) / 360, ll, min(1.0, ss * 1.35))
            px[i, j] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return img

written = []
def save(img, name):
    path = out_dir + "/" + name
    img.save(path, optimize=True)
    written.append((name, img.width, img.height))

save(crop("barDark"), "button.png")
save(crop("barLight"), "button-on.png")
save(crop("panel"), "panel.png")
save(crop("slot"), "slot.png")

# Камни редкости: та же заклёпка со сдвинутым тоном, каждый сам по себе.
for rarity, deg in hues.items():
    save(rotate_hue(crop("stud").copy(), deg), "gem-" + rarity + ".png")

print(json.dumps(written))
`;

const spec = JSON.stringify({ boxes: MEASURED, hues: RARITY_HUE });
const result = execFileSync('python', ['-c', script, sheet, outDir.replaceAll('\\', '/'), spec], { encoding: 'utf8' });
const written = JSON.parse(result.trim().split('\n').pop());
for (const [name, w, h] of written) console.log(`  ${name.padEnd(22)} ${w}x${h}`);
console.log(`Готово: ${written.length} файлов в assets/ui/kit`);
console.log('Срезы 9-slice замерить отдельно: node scripts/measure-slices.mjs');
