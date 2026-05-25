"""
Нарезает листы с предметами на отдельные PNG c прозрачным фоном
и раскладывает их по подпапкам assets/items/.

Каждый исходник содержит несколько предметов на белом фоне.
Скрипт:
  1) делает белый фон прозрачным (с допуском по цвету),
  2) находит ряды и колонки с непрозрачным контентом,
  3) обрезает каждый предмет по bbox и сохраняет в нужную папку.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ITEMS_DIR = Path(__file__).resolve().parent.parent / "assets" / "items"
SOURCE_DIR = ITEMS_DIR / "_source"

WHITE_TOLERANCE = 18
MIN_BLOB_PX = 200
PADDING = 4


def load_rgba(path: Path) -> Image.Image:
    img = Image.open(path).convert("RGBA")
    arr = np.array(img)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    is_white = (
        (r >= 255 - WHITE_TOLERANCE)
        & (g >= 255 - WHITE_TOLERANCE)
        & (b >= 255 - WHITE_TOLERANCE)
    )
    a_new = np.where(is_white, 0, a).astype(np.uint8)
    arr[..., 3] = a_new
    return Image.fromarray(arr, mode="RGBA")


def find_runs(mask_1d: np.ndarray, min_size: int = 4) -> list[tuple[int, int]]:
    """Найти непрерывные участки True в булевом массиве."""
    runs: list[tuple[int, int]] = []
    in_run = False
    start = 0
    for i, v in enumerate(mask_1d):
        if v and not in_run:
            in_run = True
            start = i
        elif not v and in_run:
            in_run = False
            if i - start >= min_size:
                runs.append((start, i))
    if in_run and len(mask_1d) - start >= min_size:
        runs.append((start, len(mask_1d)))
    return runs


def crop_with_padding(
    img: Image.Image, box: tuple[int, int, int, int], pad: int = PADDING
) -> Image.Image:
    w, h = img.size
    l, t, r, b = box
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(w, r + pad)
    b = min(h, b + pad)
    return img.crop((l, t, r, b))


def tight_bbox(region: Image.Image) -> tuple[int, int, int, int] | None:
    arr = np.array(region)
    alpha = arr[..., 3] > 0
    if not alpha.any():
        return None
    ys = np.where(alpha.any(axis=1))[0]
    xs = np.where(alpha.any(axis=0))[0]
    return (int(xs[0]), int(ys[0]), int(xs[-1]) + 1, int(ys[-1]) + 1)


def split_sheet(img: Image.Image) -> list[Image.Image]:
    """Найти все предметы на листе. Поддерживает несколько рядов."""
    arr = np.array(img)
    alpha = arr[..., 3] > 0

    row_has = alpha.any(axis=1)
    row_runs = find_runs(row_has, min_size=8)

    items: list[Image.Image] = []
    for r_start, r_end in row_runs:
        row_img = img.crop((0, r_start, img.width, r_end))
        row_arr = np.array(row_img)
        row_alpha = row_arr[..., 3] > 0
        col_has = row_alpha.any(axis=0)
        col_runs = find_runs(col_has, min_size=8)
        for c_start, c_end in col_runs:
            sub = row_img.crop((c_start, 0, c_end, row_img.height))
            bbox = tight_bbox(sub)
            if bbox is None:
                continue
            x0, y0, x1, y1 = bbox
            if (x1 - x0) * (y1 - y0) < MIN_BLOB_PX:
                continue
            tight = sub.crop(bbox)
            padded = Image.new(
                "RGBA",
                (tight.width + PADDING * 2, tight.height + PADDING * 2),
                (0, 0, 0, 0),
            )
            padded.paste(tight, (PADDING, PADDING))
            items.append(padded)
    return items


def save_items(
    sheet_path: Path,
    targets: list[tuple[str, str]],
) -> list[str]:
    """targets: список (subfolder, filename) в порядке появления слева-направо, сверху-вниз."""
    img = load_rgba(sheet_path)
    items = split_sheet(img)
    saved: list[str] = []
    if len(items) != len(targets):
        print(
            f"  WARN: {sheet_path.name}: found {len(items)} items, expected {len(targets)}"
        )
    for item_img, (subfolder, filename) in zip(items, targets):
        out_dir = ITEMS_DIR / subfolder
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / filename
        item_img.save(out_path, "PNG", optimize=True)
        saved.append(str(out_path.relative_to(ITEMS_DIR.parent.parent)))
    return saved


SHEETS: dict[str, list[tuple[str, str]]] = {
    "chatgpt_image_2_maya_2026_g_02_05_48.png": [
        ("consumables", "health_potion.png"),
        ("consumables", "mana_potion.png"),
        ("materials", "arcane_crystal.png"),
    ],
    "chatgpt_image_2_maya_2026_g_02_09_05.png": [
        ("weapons", "iron_sword.png"),
        ("weapons", "poison_sword.png"),
        ("weapons", "storm_sword.png"),
        ("weapons", "shadow_sword.png"),
    ],
    "chatgpt_image_2_maya_2026_g_02_11_20.png": [
        ("weapons", "arcane_staff.png"),
        ("weapons", "fire_staff.png"),
        ("weapons", "shadow_staff.png"),
        ("weapons", "frost_staff.png"),
    ],
    "chatgpt_image_2_maya_2026_g_02_13_25.png": [
        ("armor", "leather_armor.png"),
        ("armor", "shadow_cloak.png"),
        ("armor", "runic_shield.png"),
        ("armor", "mage_cloak_blue.png"),
        ("armor", "plate_armor.png"),
        ("armor", "magister_robe.png"),
        ("armor", "assassin_cloak.png"),
    ],
    "chatgpt_image_2_maya_2026_g_02_14_06.png": [
        ("accessories", "amulet_clover.png"),
        ("materials", "mana_crystal.png"),
        ("accessories", "amulet_evil_eye.png"),
        ("misc", "hourglass.png"),
        ("accessories", "ring_of_skulls.png"),
        ("misc", "rune_stone.png"),
        ("accessories", "royal_crown.png"),
    ],
    "chatgpt_image_11_maya_2026_g_23_06_05.png": [
        ("weapons", "hunter_bow.png"),
        ("weapons", "shadow_bow.png"),
        ("weapons", "moon_bow.png"),
        ("weapons", "war_crossbow.png"),
    ],
}


def main() -> None:
    print(f"Items dir: {ITEMS_DIR}")
    total = 0
    for sheet_name, targets in SHEETS.items():
        sheet_path = SOURCE_DIR / sheet_name
        if not sheet_path.exists():
            sheet_path = ITEMS_DIR / sheet_name
        if not sheet_path.exists():
            print(f"  SKIP: {sheet_name} not found")
            continue
        print(f"\nProcessing: {sheet_name}")
        saved = save_items(sheet_path, targets)
        for p in saved:
            print(f"  -> {p}")
        total += len(saved)
    print(f"\nDone. Saved {total} item images.")


if __name__ == "__main__":
    main()
