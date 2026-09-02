"""Release audit for inventory icon uniqueness and canvas geometry."""
from pathlib import Path
from PIL import Image
import re

ROOT = Path(__file__).resolve().parents[1]
DATA = (ROOT / 'src' / 'game-data.js').read_text(encoding='utf-8')
BASE = ROOT / 'assets' / 'items'

pool = DATA.split('const ITEM_POOL = [', 1)[1].split('];', 1)[0]
icon_block = DATA.split('const ITEM_ICON_MAP = {', 1)[1].split('};', 1)[0]
ids = re.findall(r"\bid\s*:\s*'([^']+)'", pool)
icons = dict(re.findall(r"\b(\w+)\s*:\s*'([^']+\.png)'", icon_block))
failures = []

paths = [icons.get(item_id) for item_id in ids]
if not all(paths): failures.append('Some equipment items have no icon mapping')
if len(set(paths)) != len(paths): failures.append('Equipment items reuse an icon path')

for item_id, rel in zip(ids, paths):
    if not rel: continue
    path = BASE / rel
    if not path.exists():
        failures.append(f'{item_id}: missing {rel}')
        continue
    image = Image.open(path).convert('RGBA')
    if image.size != (256, 256): failures.append(f'{item_id}: size={image.size}')
    bbox = image.getchannel('A').getbbox()
    if not bbox:
        failures.append(f'{item_id}: empty alpha')
        continue
    left, top, right, bottom = bbox
    margins = (left, top, image.width - right, image.height - bottom)
    offset = ((left + right - image.width) / 2, (top + bottom - image.height) / 2)
    if min(margins) < 7: failures.append(f'{item_id}: unsafe margins={margins}')
    if abs(offset[0]) > 1 or abs(offset[1]) > 1: failures.append(f'{item_id}: off-center={offset}')

if failures:
    for failure in failures: print('FAIL', failure)
    raise SystemExit(1)
print(f'PASS {len(ids)} equipment icons are unique, centered, complete and 256x256')
