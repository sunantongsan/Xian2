"""Normalize a generated 4x4 hero sheet (walk front, walk back, attack x4, idle/skill/hurt/dead)
into web/heroes/<id>.webp: 4x4 cells of CELLxCELL, every frame foot-anchored at (CELL/2, FOOT).

Usage: python3 tools/pack-class-sheet.py <source.png> <class-id> [cell=384] [frame:L|R|T|Bpx ...]
Packed: demon-scorpion, sword-dragonfly (defaults); sword-cricket with 14:L95
Frames are cut per source grid cell; connected components that only spill in from a neighbouring
cell are dropped, and the largest component (the body) sets the foot anchor.
"""
import sys, json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

src, cid = sys.argv[1], sys.argv[2]
CELL = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 384
# Manual trims for spill that touches the body, e.g. "14:L60" clears the left 60px of source cell 14.
TRIMS = {}
for arg in sys.argv[3:]:
    if ':' in arg:
        f, spec = arg.split(':'); TRIMS.setdefault(int(f), []).append((spec[0], int(spec[1:])))
FOOT = CELL - 32  # the game anchors feet 32px above the bottom of every cell
im = np.array(Image.open(src).convert('RGBA')).astype(np.float32)
H, W = im.shape[:2]
a = im[..., 3]
r, g, b = im[..., 0], im[..., 1], im[..., 2]
# Drop near-invisible haze and the red/orange fringe that generators leave around coloured glows.
a[a < 14] = 0
fringe = (r > g + 40) & (r > b + 30) & (a < 150)
a[fringe] = 0
im[..., 3] = a

mask = a > 200  # solid paint only, so soft glows do not bridge neighbouring frames
cw, ch = W / 4, H / 4
out = Image.new('RGBA', (CELL * 4, CELL * 4), (0, 0, 0, 0))
report = {}
full = Image.fromarray(np.clip(im, 0, 255).astype(np.uint8), 'RGBA')
for f in range(16):
    # Work inside the source grid cell; pieces that spill in from a neighbour sit on the cell edge
    # (their centre is near the border) and are dropped, the body and its own effects are kept.
    cx0, cy0 = int(round(f % 4 * cw)), int(round(f // 4 * ch))
    cx1, cy1 = int(round((f % 4 + 1) * cw)), int(round((f // 4 + 1) * ch))
    for side, px in TRIMS.get(f, []):
        sl = {'L': np.s_[cy0:cy1, cx0:cx0 + px], 'R': np.s_[cy0:cy1, cx1 - px:cx1],
              'T': np.s_[cy0:cy0 + px, cx0:cx1], 'B': np.s_[cy1 - px:cy1, cx0:cx1]}[side]
        a[sl] = 0; mask[sl] = False
    m = mask[cy0:cy1, cx0:cx1]
    labels, n = ndimage.label(m, structure=np.ones((3, 3)))
    if n == 0:
        raise SystemExit(f'frame {f} is empty')
    idx = range(1, n + 1)
    sizes = np.array(ndimage.sum(m, labels, idx))
    cents = ndimage.center_of_mass(m, labels, idx)
    hw, hh = cx1 - cx0, cy1 - cy0
    # Body: the largest component centred in the middle 60% of the cell (an effect slice spilling
    # in from a neighbour can be bigger than the character but never sits in the middle).
    central = [k for k, (yy, xx) in zip(idx, cents) if .2 * hw < xx < .8 * hw]
    body = max(central or list(idx), key=lambda k: sizes[k - 1])
    keep = [k for k, sz, (yy, xx) in zip(idx, sizes, cents)
            if k == body or (sz >= 40 and .25 * hw < xx < .75 * hw and 30 < yy < hh - 30)
            or (sz >= 40 and 40 < xx < hw - 40 and 30 < yy < hh - 30 and sz < 2500)]
    sel = np.isin(labels, keep)
    sel = ndimage.binary_dilation(sel, iterations=10) & (a[cy0:cy1, cx0:cx1] > 0)
    ys, xs = np.nonzero(sel)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    by, bx = np.nonzero(labels == body)
    foot_y = by.max() if f != 15 else by.max() - 6
    centre_x = int(np.median(bx))
    crop = full.crop((cx0 + x0, cy0 + y0, cx0 + x1, cy0 + y1))
    cm = np.array(crop.getchannel('A'))
    cm = np.where(sel[y0:y1, x0:x1], cm, 0).astype(np.uint8)
    crop.putalpha(Image.fromarray(cm))
    ox = CELL // 2 - (centre_x - x0)
    oy = FOOT - (foot_y - y0)
    cell = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    cell.paste(crop, (ox, oy), crop)
    out.alpha_composite(cell, ((f % 4) * CELL, (f // 4) * CELL))
    report[f] = {'body_h': int(by.max() - by.min()), 'w': int(x1 - x0)}

dest = Path(__file__).resolve().parents[1] / 'web' / 'heroes' / f'{cid}.webp'
out.save(dest, 'WEBP', quality=88, method=6)
print(json.dumps({'out': str(dest), 'bytes': dest.stat().st_size, 'frames': report}))
