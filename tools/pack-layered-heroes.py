"""Compile supplied layer contracts without repainting or resampling pixels.
Usage: python3 tools/pack-layered-heroes.py ../assets
"""
from PIL import Image
import pathlib,json,sys,io
root=pathlib.Path(sys.argv[1]);out=pathlib.Path(__file__).resolve().parents[1]/'web/heroes/layered';out.mkdir(parents=True,exist_ok=True)
names={'cockro-original-look-separated-weapons-32-local-candidate':'sword-cockro','dragonfly-gunner-separated-cannons-32-local-candidate':'sword-dragonfly','scorpion-gauntlet-local-candidate':'demon-scorpion'}
all_data={}
for cp in sorted(root.rglob('layer-contract.json')):
 if cp.parent.name not in names:continue
 hero=names[cp.parent.name];d=json.loads(cp.read_text());dest=out/hero;dest.mkdir(exist_ok=True)
 body=Image.open(cp.parent/'assets/body-base.png').convert('RGBA');fgname=d.get('foreground_atlas') or 'assets/foreground-hands.png'
 fg=Image.open(cp.parent/fgname).convert('RGBA');pieces=[];frames=[]
 def add(im,origin):
  box=im.getbbox()
  if not box:return None
  idx=len(pieces);pieces.append(im.crop(box));return {'piece':idx,'origin':[origin[0]+box[0],origin[1]+box[1]]}
 for f in d['frames']:
  x,y,w,h=f['body_rect'];frame={'mode':f['mode'],'body':add(body.crop((x,y,x+w,y+h)),d['body_offset']),'weapons':{},'effects':{}}
  if f.get('foreground'):
   g=f['foreground'];x,y,w,h=g['atlas_rect'];frame['foreground']=add(fg.crop((x,y,x+w,y+h)),[64+g['body_origin'][0],64+g['body_origin'][1]])
  for kind in ['weapons','effects']:
   for key,val in f.get(kind,{}).items():frame[kind][key]=add(Image.open(cp.parent/val['path']).convert('RGBA'),[0,0])
  frames.append(frame)
 # Tight shelf packing: alpha padding removed, original pixels retained.
 pages=[];rects={};page=Image.new('RGBA',(1024,1024));x=y=row=0;pi=0
 for i in sorted(range(len(pieces)),key=lambda i:-pieces[i].height):
  im=pieces[i]
  if x+im.width>1024:x=0;y+=row+2;row=0
  if y+im.height>1024:pages.append(page);page=Image.new('RGBA',(1024,1024));pi+=1;x=y=row=0
  page.paste(im,(x,y));rects[i]=[pi,x,y,im.width,im.height];x+=im.width+2;row=max(row,im.height)
 pages.append(page)
 def resolve(v):
  if isinstance(v,dict):
   if 'piece' in v:
    pi,x,y,w,h=rects[v.pop('piece')];v['page']=pi;v['rect']=[x,y,w,h]
   else:
    for item in v.values():resolve(item)
  elif isinstance(v,list):
   for item in v:resolve(item)
 resolve(frames)
 paths=[]
 for i,im in enumerate(pages):
  p=dest/f'{i}.webp';buf=io.BytesIO();im.save(buf,format='WEBP',lossless=True,method=6);p.write_bytes(buf.getvalue());paths.append(f'heroes/layered/{hero}/{i}.webp')
 all_data[hero]={'pages':paths,'pivot':d['padded_pivot'],'frames':frames,'weapons':list(d['frames'][0]['weapons'])}
 print(hero,len(pages),'pages',round(len(pages)*4,1),'MiB decoded')
(out.parent.parent/'layered-hero-data.js').write_text('// Compiled losslessly from supplied layer contracts.\nexport const LAYERED_HEROES='+json.dumps(all_data,separators=(',',':'))+';\n')
