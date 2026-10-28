"""Build a full, integrity-checked web bundle for the native file picker."""
import hashlib,json,zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
files={p.relative_to(root/'web').as_posix():p for p in (root/'web').rglob('*') if p.is_file() and p.suffix in {'.html','.js','.css','.json','.webp','.ttf','.txt','.ogg','.mp3','.wav','.svg'} and p.name!='patch.json'}
manifest={'game':'cockro','engine':88,'version':'4.4.1','files':{n:hashlib.sha256(p.read_bytes()).hexdigest() for n,p in sorted(files.items())}}
with zipfile.ZipFile(root/'Cockro-patch-4.4.1.zip','w',zipfile.ZIP_DEFLATED) as z:
 for n,p in sorted(files.items()):z.write(p,n)
 z.writestr('patch.json',json.dumps(manifest))
print('Packaged',len(files),'files')

