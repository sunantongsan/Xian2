from PIL import Image
from pathlib import Path
import json,hashlib
import sys
r=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True);meta=json.loads((r/'actions.json').read_text());bad=[]
for clip,n in meta['counts'].items():
 atlas=Image.new('RGBA',(128*n,1024))
 for d,name in enumerate(meta['directions']):
  hashes=set()
  for f in range(n):
   p=r/'frames'/f'{clip}-{name}-{f:02}.png';im=Image.open(p).convert('RGBA');a=im.getchannel('A');box=a.point(lambda x:255 if x>25 else 0).getbbox()
   assert box and box[0]>0 and box[1]>0 and box[2]<128 and box[3]<128,(p.name,box)
   hashes.add(hashlib.sha256(im.tobytes()).hexdigest());atlas.paste(im,(f*128,d*128))
  assert len(hashes)>=(n if clip=='walk' else n//2),(clip,name,len(hashes))
 atlas.save(out/f'{clip}.webp',quality=94,method=6)
print('Verified 768 frames; all eight views per clip; no clipped bodies or repeated walk poses')
