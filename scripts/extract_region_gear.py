"""Re-extract the twelve original regional item icons from their source atlas.

The source art does not stay inside a mathematical 4x3 grid, so each item has
an explicit safe crop. The shared normalizer then trims transparent pixels,
preserves the complete silhouette and centers it on the standard 256px canvas.
"""
from pathlib import Path
from PIL import Image
from normalize_item_icons import normalize_image

ROOT = Path(__file__).resolve().parents[1]
SHEET = ROOT / 'assets' / 'items' / 'region-gear-sheet.png'
OUT = ROOT / 'assets' / 'items' / 'progression'

BOXES = {
    'ash_sword': (55, 35, 360, 350),
    'forge_hammer': (395, 35, 710, 350),
    'vent_shield': (710, 30, 1000, 355),
    'coal_bow': (1030, 30, 1448, 360),
    'siege_crossbow': (35, 370, 385, 690),
    'spark_cloak': (380, 370, 725, 705),
    'magma_wand': (710, 350, 1020, 735),
    'volcano_staff': (1015, 345, 1400, 710),
    'phoenix_robe': (25, 680, 385, 1070),
    'hourglass_forge': (390, 675, 710, 1075),
    'tide_blade': (690, 675, 1045, 1086),
    'abyss_staff': (1015, 724, 1400, 1086),
}

def main():
    sheet = Image.open(SHEET).convert('RGBA')
    OUT.mkdir(parents=True, exist_ok=True)
    for name, box in BOXES.items():
        path = OUT / f'{name}.png'
        sheet.crop(box).save(path, optimize=True)
        normalize_image(path, size=256, pad=8)
        print(path.relative_to(ROOT))

if __name__ == '__main__':
    main()
