"""Publish only game assets and an integrity-checked update feed, never repository files."""
import hashlib,json,shutil,zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'web/release.json').read_text())['version']
output=root/'patch-public'
if output.exists(): shutil.rmtree(output)
(output/'patches').mkdir(parents=True)
files={p.relative_to(root/'web').as_posix():p for p in (root/'web').rglob('*') if p.is_file() and p.suffix in {'.html','.js','.css','.json','.webp','.ttf','.txt','.ogg','.mp3','.wav','.svg'} and p.name!='patch.json'}
assert not list((root/'web').rglob('*.png')), 'PNG is unsupported by the installed Android patch extractor; use WebP'
for asset in ['cowboy.webp','wuxia.webp','knight-open.webp']:
 assert 'fashion/'+asset in files, 'Missing wardrobe atlas: '+asset
manifest={'game':'cockro','engine':88,'version':version,'files':{n:hashlib.sha256(p.read_bytes()).hexdigest() for n,p in sorted(files.items())}}
archive=output/'patches/bundle.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for name,path in sorted(files.items()):
  entry=zipfile.ZipInfo(name,date_time=(2026,1,1,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;z.writestr(entry,path.read_bytes())
 entry=zipfile.ZipInfo('patch.json',date_time=(2026,1,1,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;z.writestr(entry,json.dumps(manifest,sort_keys=True))
digest=hashlib.sha256(archive.read_bytes()).hexdigest();size=archive.stat().st_size
archive.rename(output/'patches'/f'{digest}.zip')
feed={'game':'cockro','engine':88,'minAppVersionCode':100,'version':version,'size':size,'sha256':digest,'path':f'patches/{digest}.zip'}
(output/'latest.json').write_text(json.dumps(feed,sort_keys=True))
(output/'index.html').write_text('<!doctype html><meta charset="utf-8"><title>COCKRO Updates</title><h1>COCKRO</h1><p>Game update distribution.</p>')
shutil.copytree(root/'web',output/'play')
print(json.dumps(feed))

