"""Normalize a generated 4x4 hero sheet (walk front, walk back, attack x4, idle/skill/hurt/dead)
into web/heroes/<id>.webp: 4x4 cells of CELLxCELL, every frame foot-anchored at (CELL/2, FOOT).

Usage: python3 tools/pack-class-sheet.py <source.png> <class-id>
Frames are found by connected components (alpha) assigned to the 4x4 grid by centroid, so glow
and slash arcs that spill over a source cell edge stay with their own frame.
"""
import sys, json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

CELL, FOOT = 384, 352
src, cid = sys.argv[1], sys.argv[2]
im = np.array(Image.open(src).convert('RGBA')).astype(np.float32)
H, W = im.shape[:2]
a = im[..., 3]
r, g, b = im[..., 0], im[..., 1], im[..., 2]
# Drop near-invisible haze and the red/orange fringe that generators leave around coloured glows.
a[a < 14] = 0
fringe = (r > g + 40) & (r > b + 30) & (a < 150)
a[fringe] = 0
im[..., 3] = a

mask = a > 48
labels, n = ndimage.label(mask, structure=np.ones((3, 3)))
sizes = ndimage.sum(mask, labels, range(1, n + 1))
centers = ndimage.center_of_mass(mask, labels, range(1, n + 1))
cw, ch = W / 4, H / 4
frames = {f: [] for f in range(16)}
for k, (size, (cy, cx)) in enumerate(zip(sizes, centers), start=1):
    if size < 40:
        continue
    f = min(3, int(cy // ch)) * 4 + min(3, int(cx // cw))
    frames[f].append(k)

out = Image.new('RGBA', (CELL * 4, CELL * 4), (0, 0, 0, 0))
report = {}
full = Image.fromarray(np.clip(im, 0, 255).astype(np.uint8), 'RGBA')
for f in range(16):
    ids = frames[f]
    if not ids:
        raise SystemExit(f'frame {f} is empty')
    sel = np.isin(labels, ids)
    # Soft glow pixels around the selected components belong to the frame too.
    sel = ndimage.binary_dilation(sel, iterations=10) & (a > 0)
    ys, xs = np.nonzero(sel)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    # Foot line: lowest row of the largest (body) component; centre from the body, not the effect.
    body = max(ids, key=lambda k: sizes[k - 1])
    by, bx = np.nonzero(labels == body)
    foot_y = by.max() if f != 15 else by.max() - 6
    centre_x = int(np.median(bx))
    crop = full.crop((x0, y0, x1, y1))
    cm = Image.fromarray((sel[y0:y1, x0:x1] * 255).astype(np.uint8))
    crop.putalpha(Image.fromarray(np.minimum(np.array(crop.getchannel('A')), np.array(cm))))
    ox = (f % 4) * CELL + CELL // 2 - (centre_x - x0)
    oy = (f // 4) * CELL + FOOT - (foot_y - y0)
    # Clip to the destination cell so frames never bleed into neighbours.
    cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    cell.alpha_composite(crop, (ox - (f % 4) * CELL, oy - (f // 4) * CELL)) if ox - (f % 4) * CELL >= 0 and oy - (f // 4) * CELL >= 0 else cell.paste(crop, (ox - (f % 4) * CELL, oy - (f // 4) * CELL), crop)
    out.alpha_composite(cell, ((f % 4) * CELL, (f // 4) * CELL))
    report[f] = {'body_h': int(by.max() - by.min()), 'w': int(x1 - x0)}

dest = Path(__file__).resolve().parents[1] / 'web' / 'heroes' / f'{cid}.webp'
out.save(dest, 'WEBP', quality=88, method=6)
print(json.dumps({'out': str(dest), 'bytes': dest.stat().st_size, 'frames': report}))
