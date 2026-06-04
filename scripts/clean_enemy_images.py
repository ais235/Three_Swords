"""
Post-process enemy portraits:
- remove near-white background and white fringes
- crop to alpha bbox
- scale to fill a fixed square canvas (default 512x512) with small padding

Intended for portraits extracted from composite "pack" images.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ENEMIES_DIR = ROOT / "assets" / "enemies"

CANVAS = 512
PADDING = 4

# Background/fringe controls
ALPHA_KEEP = 10
WHITE_LUMA = 235        # treat bright pixels as background candidates
SAT_MAX = 22            # treat low-saturation pixels as background candidates
FRINGE_ALPHA = 70       # if alpha below this and pixel is near-white -> knock out


def bbox_alpha(im: Image.Image, thr: int = 8):
    a = im.split()[-1]
    bb = a.point(lambda v: 255 if v > thr else 0).getbbox()
    return bb


def dewhite(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            mx = max(r, g, b)
            mn = min(r, g, b)
            sat = mx - mn
            # candidates: very bright + low saturation
            if mn >= WHITE_LUMA and sat <= SAT_MAX:
                px[x, y] = (r, g, b, 0)
            elif a <= FRINGE_ALPHA and mn >= (WHITE_LUMA - 10) and sat <= (SAT_MAX + 8):
                # fringe cleanup: soften / remove white halo
                px[x, y] = (r, g, b, 0)
    return im


def normalize(im: Image.Image, size: int = CANVAS, pad: int = PADDING) -> Image.Image:
    bb = bbox_alpha(im, thr=ALPHA_KEEP)
    if not bb:
        return Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cropped = im.crop(bb)
    cw, ch = cropped.size
    inner = size - 2 * pad
    if inner <= 0:
        raise ValueError("bad padding")
    scale = min(inner / cw, inner / ch)
    nw = max(1, int(round(cw * scale)))
    nh = max(1, int(round(ch * scale)))
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ox = (size - nw) // 2
    oy = (size - nh) // 2
    out.paste(resized, (ox, oy), resized)
    return out


def process(path: Path) -> None:
    im = Image.open(path).convert("RGBA")
    im = dewhite(im)
    im = normalize(im)
    im.save(path, "PNG", optimize=True)


def main() -> None:
    targets = [
        "bandit.png",
        "wolf.png",
        "bandit_thrower.png",
        "spearman.png",
        "bog_lurker.png",
        "thorn_dryad.png",
        "rat_swarm.png",
        "cultist.png",
        "hexer.png",
        "shieldbearer.png",
        "crossbowman.png",
        "stone_golem.png",
        "void_stalker.png",
        "blood_knight.png",
        "banshee.png",
        "plague_doctor.png",
        "arcane_sentinel.png",
    ]
    for name in targets:
        p = ENEMIES_DIR / name
        if p.exists():
            process(p)
            print("ok", p.relative_to(ROOT))


if __name__ == "__main__":
    main()

