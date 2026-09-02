from pathlib import Path
from PIL import Image
import argparse

NAMES = [
    'tide_trident', 'deep_shell', 'current_bow', 'harpoon_crossbow',
    'sea_cloak', 'tide_staff', 'deep_robe', 'tide_heart'
]

parser = argparse.ArgumentParser()
parser.add_argument('atlas', type=Path)
parser.add_argument('output', type=Path)
parser.add_argument('--resize-alpha', action='store_true')
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)

if args.resize_alpha:
    for name in NAMES:
        path = args.output / f'{name}.png'
        image = Image.open(path).convert('RGBA')
        image.resize((362, 362), Image.Resampling.LANCZOS).save(path, optimize=True)
        print(path)
else:
    atlas = Image.open(args.atlas).convert('RGB')
    width, height = atlas.size
    for index, name in enumerate(NAMES):
        col, row = index % 4, index // 4
        left, right = round(col * width / 4), round((col + 1) * width / 4)
        top, bottom = round(row * height / 2), round((row + 1) * height / 2)
        atlas.crop((left, top, right, bottom)).save(args.output / f'{name}-key.png')
        print(args.output / f'{name}-key.png')
