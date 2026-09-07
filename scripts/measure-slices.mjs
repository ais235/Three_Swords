/**
 * Measure the 9-slice inset of every frame in assets/ui/kit.
 *
 * border-image cuts a source into nine pieces along these insets: the corners are
 * kept whole, the edges are stretched, and the middle fills the box. Get the
 * number wrong and the ornament either smears or gets clipped, so it is measured
 * rather than guessed - the plan for this project calls out guessed slices as a
 * known way to lose an hour.
 *
 * Method: walk inward from each edge along the middle row or column until the
 * pixels stop changing. That point is where the frame ends and the flat interior
 * begins. A decorated corner (the rarity gem, the button's end cap) reaches
 * further in than the frame does, so its extent is reported separately: the slice
 * has to clear the decoration, not just the border.
 *
 *   node scripts/measure-slices.mjs
 */
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const kitDir = resolve(root, 'assets/ui/kit');

const script = `
import sys, json, glob, os
from PIL import Image

def edge_inset(vals, tol=8):
    """Сколько пикселей от края, пока цвет не перестаёт меняться."""
    ref = vals[-1]
    for i, v in enumerate(vals):
        if max(abs(int(a) - int(b)) for a, b in zip(v[:3], ref[:3])) <= tol and v[3] == ref[3]:
            return i
    return len(vals) // 3

out = []
for path in sorted(glob.glob(sys.argv[1] + "/*.png")):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    cx, cy = w // 2, h // 2
    top = edge_inset([px[cx, y] for y in range(0, cy)])
    bottom = edge_inset([px[cx, y] for y in range(h - 1, cy, -1)])
    left = edge_inset([px[x, cy] for x in range(0, cx)])
    right = edge_inset([px[x, cy] for x in range(w - 1, cx, -1)])
    # Насколько далеко внутрь заходит непрозрачное украшение угла.
    corner = 0
    for j in range(h):
        for i in range(w):
            if px[i, j][3] > 24:
                near_r, near_b = w - i, h - j
                if near_r < w // 2 and near_b < h // 2:
                    corner = max(corner, min(near_r, near_b))
    out.append({"file": os.path.basename(path), "w": w, "h": h,
                "top": top, "right": right, "bottom": bottom, "left": left,
                "cornerReach": corner})
print(json.dumps(out))
`;

const raw = execFileSync('python', ['-c', script, kitDir.replaceAll('\\', '/')], { encoding: 'utf8' });
const rows = JSON.parse(raw.trim().split('\n').pop());

console.log('файл                    размер     срез Т/П/Н/Л      угол');
for (const row of rows) {
  const slice = `${row.top} ${row.right} ${row.bottom} ${row.left}`;
  console.log(`  ${row.file.padEnd(22)} ${String(row.w + 'x' + row.h).padEnd(9)} ${slice.padEnd(16)} ${row.cornerReach}`);
}
console.log('\nВ CSS: border-image: url(...) <срез> [fill] stretch;');
console.log('Толщина border-width задаётся отдельно и может быть меньше среза — он сожмётся.');
