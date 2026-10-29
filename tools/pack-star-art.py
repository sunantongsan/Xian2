"""Pack painted art for ดาวฮีโร่ into web/maps/star/ and record it in web/maps/star/art.json.

  python3 tools/pack-star-art.py ground  <zone 1-12> <texture.png>   seamless top-down ground
  python3 tools/pack-star-art.py ground2 <zone 1-12> <texture.png>   optional second ground (mixed in by noise)
  python3 tools/pack-star-art.py props   <zone 1-12> <atlas.png>     4x2 transparent prop sheet

Ground textures are resized to 1024px, seam-blended in a narrow border band and saved as WebP; the
average colour is stored for cliffs and the minimap. Prop sheets are cut per 4x2 cell, cleaned of haze
and red fringe, and re-packed into 4x2 cells of 320x400 with every object's base at y=388.
"""
import sys, json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

root = Path(__file__).resolve().parents[1]
outdir = root / 'web' / 'maps' / 'star'
outdir.mkdir(parents=True, exist_ok=True)
manifest_path = outdir / 'art.json'
manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
kind, zone, src = sys.argv[1], int(sys.argv[2]) - 1, sys.argv[3]
assert kind in ('ground', 'ground2', 'props') and 0 <= zone < 12
entry = manifest.setdefault(str(zone), {})

if kind.startswith('ground'):
    im = Image.open(src).convert('RGB').resize((1024, 1024), Image.LANCZOS)
    a = np.array(im).astype(np.float32)
    rolled = np.roll(np.roll(a, 512, 0), 512, 1)
    n = 1024; band = 56
    d = np.minimum.outer(np.minimum(np.arange(n), n - 1 - np.arange(n)), np.minimum(np.arange(n), n - 1 - np.arange(n)))
    w = np.clip(d / band, 0, 1)[..., None]
    out = (a * w + rolled * (1 - w)).clip(0, 255).astype(np.uint8)
    name = f'{kind}-{zone}.webp'
    Image.fromarray(out).save(outdir / name, 'WEBP', quality=84, method=6)
    entry[kind] = {'file': f'maps/star/{name}', 'avg': '#%02x%02x%02x' % tuple(int(v) for v in out.reshape(-1, 3).mean(0))}
else:
    src_im = np.array(Image.open(src).convert('RGBA')).astype(np.float32)
    H, W = src_im.shape[:2]
    r, g, b, al = (src_im[..., i] for i in range(4))
    al[al < 14] = 0
    al[(r > g + 40) & (r > b + 30) & (al < 150)] = 0
    src_im[..., 3] = al
    full = Image.fromarray(src_im.clip(0, 255).astype(np.uint8), 'RGBA')
    CW, CH, BASE = 320, 400, 388
    sheet = Image.new('RGBA', (CW * 4, CH * 2), (0, 0, 0, 0))
    heights = []
    for k in range(8):
        cx0, cy0 = round(k % 4 * W / 4), round(k // 4 * H / 2)
        cx1, cy1 = round((k % 4 + 1) * W / 4), round((k // 4 + 1) * H / 2)
        m = al[cy0:cy1, cx0:cx1] > 60
        lab, nlab = ndimage.label(m, structure=np.ones((3, 3)))
        sizes = ndimage.sum(m, lab, range(1, nlab + 1))
        main = int(np.argmax(sizes)) + 1
        keep = [i + 1 for i, s in enumerate(sizes) if i + 1 == main or s > 300]
        sel = ndimage.binary_dilation(np.isin(lab, keep), iterations=8) & (al[cy0:cy1, cx0:cx1] > 0)
        ys, xs = np.nonzero(sel)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        crop = full.crop((cx0 + x0, cy0 + y0, cx0 + x1, cy0 + y1))
        crop.putalpha(Image.fromarray(np.where(sel[y0:y1, x0:x1], np.array(crop.getchannel('A')), 0).astype(np.uint8)))
        s = min(1, (CW - 8) / crop.width, (BASE - 4) / crop.height)
        if s < 1:
            crop = crop.resize((max(1, int(crop.width * s)), max(1, int(crop.height * s))), Image.LANCZOS)
        cell = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
        cell.paste(crop, ((CW - crop.width) // 2, BASE - crop.height), crop)
        sheet.alpha_composite(cell, (k % 4 * CW, k // 4 * CH))
        heights.append(crop.height)
    name = f'props-{zone}.webp'
    sheet.save(outdir / name, 'WEBP', quality=86, method=6)
    entry['props'] = {'file': f'maps/star/{name}', 'cell': [CW, CH], 'base': BASE, 'heights': heights}

manifest_path.write_text(json.dumps(manifest, indent=1, sort_keys=True))
print(json.dumps({str(zone + 1): entry}))
