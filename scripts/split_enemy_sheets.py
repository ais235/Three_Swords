"""
Splits composite "pack" PNGs (exported from ChatGPT) into individual enemy portraits.

The packs in assets/enemies/ are large PNGs with multiple characters on white background.
We:
1) Key out near-white background to transparency
2) Detect sprite regions via x/y projections (find big gaps)
3) Crop each sprite by its non-transparent bbox
4) Save to assets/enemies/<id>.png

Also normalizes the output portraits to a square canvas (default 256x256) similar to item icons.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ENEMIES_DIR = ROOT / "assets" / "enemies"

CANVAS = 512
PADDING = 8
ALPHA_THRESHOLD = 12
WHITE_KEY = 248  # treat near-white as background


def key_out_white(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r >= WHITE_KEY and g >= WHITE_KEY and b >= WHITE_KEY:
                px[x, y] = (r, g, b, 0)
    return im


def bbox_nontransparent(im: Image.Image) -> tuple[int, int, int, int] | None:
    a = im.split()[-1].load()
    w, h = im.size
    min_x, min_y = w, h
    max_x = max_y = 0
    found = False
    for y in range(h):
        for x in range(w):
            if a[x, y] > ALPHA_THRESHOLD:
                found = True
                if x < min_x:
                    min_x = x
                if y < min_y:
                    min_y = y
                if x > max_x:
                    max_x = x
                if y > max_y:
                    max_y = y
    if not found:
        return None
    return (min_x, min_y, max_x + 1, max_y + 1)


def find_runs(flags: list[bool], min_gap: int = 20) -> list[tuple[int, int]]:
    runs: list[tuple[int, int]] = []
    i = 0
    n = len(flags)
    while i < n:
        while i < n and not flags[i]:
            i += 1
        if i >= n:
            break
        j = i
        while j < n and flags[j]:
            j += 1
        runs.append((i, j))
        i = j
    # Merge runs separated by tiny gaps (noise)
    merged: list[tuple[int, int]] = []
    for r in runs:
        if not merged:
            merged.append(r)
            continue
        ps, pe = merged[-1]
        if r[0] - pe <= min_gap:
            merged[-1] = (ps, r[1])
        else:
            merged.append(r)
    # Filter tiny runs
    out = []
    for s, e in merged:
        if e - s >= 12:
            out.append((s, e))
    return out


def normalize_to_canvas(im: Image.Image, size: int = CANVAS, pad: int = PADDING) -> Image.Image:
    box = bbox_nontransparent(im)
    if box is None:
        return Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cropped = im.crop(box)
    cw, ch = cropped.size
    inner = size - 2 * pad
    scale = min(inner / cw, inner / ch, 1.0)
    nw = max(1, int(round(cw * scale)))
    nh = max(1, int(round(ch * scale)))
    if scale < 1.0:
        resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    else:
        resized = cropped
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ox = (size - nw) // 2
    oy = (size - nh) // 2
    out.paste(resized, (ox, oy), resized)
    return out


def split_pack(pack_path: Path, out_ids: list[str]) -> list[Path]:
    src = Image.open(pack_path)
    im = key_out_white(src)
    w, h = im.size

    # Connected components on a downscaled alpha mask.
    scale = 4
    sw = max(1, w // scale)
    sh = max(1, h // scale)
    small = im.resize((sw, sh), Image.Resampling.NEAREST)
    apx = small.split()[-1].load()
    seen = [[False] * sw for _ in range(sh)]

    def neighbors(x: int, y: int):
        if x > 0:
            yield x - 1, y
        if x + 1 < sw:
            yield x + 1, y
        if y > 0:
            yield x, y - 1
        if y + 1 < sh:
            yield x, y + 1

    comps: list[tuple[int, int, int, int, int]] = []  # minx,miny,maxx,maxy,count (small coords)
    for y in range(sh):
        for x in range(sw):
            if seen[y][x]:
                continue
            if apx[x, y] <= ALPHA_THRESHOLD:
                continue
            # BFS
            q = [(x, y)]
            seen[y][x] = True
            minx = maxx = x
            miny = maxy = y
            count = 0
            while q:
                cx, cy = q.pop()
                count += 1
                if cx < minx:
                    minx = cx
                if cx > maxx:
                    maxx = cx
                if cy < miny:
                    miny = cy
                if cy > maxy:
                    maxy = cy
                for nx, ny in neighbors(cx, cy):
                    if seen[ny][nx]:
                        continue
                    seen[ny][nx] = True
                    if apx[nx, ny] > ALPHA_THRESHOLD:
                        q.append((nx, ny))

            # Filter tiny noise blobs
            if count >= 120:
                comps.append((minx, miny, maxx + 1, maxy + 1, count))

    # Convert to original coords and sort top-to-bottom then left-to-right.
    cells: list[tuple[int, int, int, int]] = []
    for minx, miny, maxx, maxy, _ in comps:
        xs = max(0, minx * scale - 8)
        ys = max(0, miny * scale - 8)
        xe = min(w, maxx * scale + 8)
        ye = min(h, maxy * scale + 8)
        sub = im.crop((xs, ys, xe, ye))
        # Tighten by bbox of nontransparent pixels (after white keyout)
        bb = bbox_nontransparent(sub)
        if bb is None:
            continue
        bx0, by0, bx1, by1 = bb
        cells.append((xs + bx0, ys + by0, xs + bx1, ys + by1))

    # Merge nearby boxes (e.g. detached particles, weapon tips) into a single sprite bbox.
    def overlaps(a: tuple[int, int, int, int], b: tuple[int, int, int, int], margin: int = 22) -> bool:
        ax0, ay0, ax1, ay1 = a
        bx0, by0, bx1, by1 = b
        ax0 -= margin
        ay0 -= margin
        ax1 += margin
        ay1 += margin
        return not (bx1 < ax0 or bx0 > ax1 or by1 < ay0 or by0 > ay1)

    merged = True
    while merged and len(cells) > 1:
        merged = False
        out: list[tuple[int, int, int, int]] = []
        used = [False] * len(cells)
        for i in range(len(cells)):
            if used[i]:
                continue
            x0, y0, x1, y1 = cells[i]
            used[i] = True
            changed = True
            while changed:
                changed = False
                for j in range(len(cells)):
                    if used[j]:
                        continue
                    if overlaps((x0, y0, x1, y1), cells[j]):
                        bx0, by0, bx1, by1 = cells[j]
                        x0 = min(x0, bx0)
                        y0 = min(y0, by0)
                        x1 = max(x1, bx1)
                        y1 = max(y1, by1)
                        used[j] = True
                        changed = True
                        merged = True
            out.append((x0, y0, x1, y1))
        cells = out

    def sort_key(r: tuple[int, int, int, int]):
        xs, ys, xe, ye = r
        return (ys + ye) // 2, (xs + xe) // 2

    cells.sort(key=sort_key)

    if len(cells) != len(out_ids):
        raise SystemExit(f"{pack_path.name}: detected {len(cells)} sprites, expected {len(out_ids)}")

    written: list[Path] = []
    for rect, eid in zip(cells, out_ids):
        xs, ys, xe, ye = rect
        sub = im.crop((xs, ys, xe, ye))
        out = normalize_to_canvas(sub)
        out_path = ENEMIES_DIR / f"{eid}.png"
        out.save(out_path, "PNG", optimize=True)
        written.append(out_path)
    return written


def main() -> None:
    # Hardcoded mapping for the three "pack" images currently in assets/enemies/.
    packs = [
        ("chatgpt_image_22_maya_2026_g_19_26_18.png", ["scout_rogue", "spearman", "bog_lurker", "thorn_dryad", "rat_swarm", "cultist"]),
        ("chatgpt_image_22_maya_2026_g_19_33_38.png", ["blood_knight", "banshee", "plague_doctor", "arcane_sentinel", "wolf", "bandit_thrower"]),
        ("chatgpt_image_22_maya_2026_g_19_33_48.png", ["hexer", "shieldbearer", "cultist", "stone_golem", "void_stalker", "crossbowman"]),
    ]

    wrote = []
    for fname, ids in packs:
        p = ENEMIES_DIR / fname
        if not p.exists():
            continue
        wrote.extend(split_pack(p, ids))

    print("OK. Wrote:")
    for p in wrote:
        print(" -", p.relative_to(ROOT))


if __name__ == "__main__":
    main()
