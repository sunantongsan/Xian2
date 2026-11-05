"""Compile transparent approved sprite sheets without repainting/resampling.
Arguments: dragonfly-green scorpion-gold cockro-guard cricket-scientist cricket-engineer PNG paths.
"""
from pathlib import Path
from PIL import Image
import numpy as np,json,sys,io,hashlib
root=Path(__file__).resolve().parents[1];out=root/'web/heroes/mutations';out.mkdir(parents=True,exist_ok=True)
ids=['dragonfly-green','scorpion-gold','cockro-guard','cricket-scientist','cricket-engineer'];data={}
for key,path in zip(ids,sys.argv[1:],strict=True):
 im=Image.open(path).convert('RGBA');a=np.array(im);w,h=im.size
 if np.percentile(a[:,:,3],10)>8:raise ValueError(f'{key}: background is not transparent')
 frames=[]
 for i in range(32):
  col,row=i%4,i//4;x,x2=round(col*w/4),round((col+1)*w/4);y,y2=round(row*h/8),round((row+1)*h/8)
  alpha=a[y:y2,x:x2,3];yy,xx=np.where(alpha>180)
  bottom=int(yy.max());foot_y,foot_x=np.where(alpha[max(0,bottom-18):bottom+1]>180)
  # Ground root, independent of antennas, wings and bright skill glow.
  px=float((foot_x.min()+foot_x.max())/2) if row!=4 else (x2-x)/2
  top=round((y2-y)*.10) # empty top gutter excludes glow bleeding from previous row
  frames.append({'rect':[x,y+top,x2-x,y2-y-top],'pivot':[px,bottom+1-top]})
 b=io.BytesIO();im.save(b,format='WEBP',lossless=True,method=6);p=out/(key+'.webp');p.write_bytes(b.getvalue())
 data[key]={'file':'heroes/mutations/'+key+'.webp','width':w,'height':h,'referenceHeight':round(h/8*.76,2),'frames':frames,'sourceSha256':hashlib.sha256(Path(path).read_bytes()).hexdigest()}
 print(key,im.size,p.stat().st_size)
(root/'web/mutation-art-data.js').write_text('// Compiled source rectangles and measured ground roots.\nexport const MUTATION_ART='+json.dumps(data,separators=(',',':'))+';\n')
