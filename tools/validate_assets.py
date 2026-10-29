"""Check shipped WebP atlases without external dependencies."""
from pathlib import Path
import struct
assets = Path(__file__).resolve().parents[1] / 'web' / 'sprites'
files = [f'monsters-{i}.webp' for i in range(10)]
total = 0
for name in files:
    data = (assets / name).read_bytes()
    assert data[:4] == b'RIFF' and data[8:12] == b'WEBP', name
    assert struct.unpack('<I', data[4:8])[0] + 8 == len(data), f'Truncated atlas: {name}'
    assert data[12:16] == b'VP8X' and data[20] & 16, f'Missing alpha: {name}'
    w, h = int.from_bytes(data[24:27], 'little') + 1, int.from_bytes(data[27:30], 'little') + 1
    assert w >= 1000 and h >= 800, (name, w, h)
    total += len(data)
    print(name, w, h, len(data))
assert (assets.parent / 'assets' / 'NotoSansThai.ttf').is_file()
assert (assets.parent / 'assets' / 'NotoSansThai-LICENSE.txt').is_file()
print(f'Validated 10 monster atlases: {total:,} bytes')

for name in ['town','bamboo']:
    data=(assets.parent/'maps'/f'{name}.webp').read_bytes()
    assert data[:4]==b'RIFF' and data[8:12]==b'WEBP'
    assert struct.unpack('<I',data[4:8])[0]+8==len(data)
    assert len(data)>100000
    print('Painted map',name,len(data))


import json
star=json.loads((assets.parent/'maps'/'hero-star.json').read_text(encoding='utf-8'))
assert star['orientation']=='isometric' and star['width']>=160 and star['height']>=160
names={l['name'] for l in star['layers']}
assert {'ground','props','zones','spawns','pois'}<=names, names
assert len([t for t in star['tilesets'] if t['name']=='hero-star-zones'][0]['tiles'])==12
print('Tiled map hero-star.json',star['width'],'x',star['height'],len(next(l for l in star['layers'] if l['name']=='spawns')['objects']),'camps')

for hero in ['sword-male','sword-female','demon-male','demon-female']:
    for state,expected_h in [('walk',1024),('actions',512)]:
        path=assets.parent/'heroes'/f'{hero}-{state}.webp'
        data=path.read_bytes()
        assert data[:4]==b'RIFF' and data[8:12]==b'WEBP',path
        assert struct.unpack('<I',data[4:8])[0]+8==len(data),path
        assert data[12:16]==b'VP8X' and data[20]&16,path
        w,h=int.from_bytes(data[24:27],'little')+1,int.from_bytes(data[27:30],'little')+1
        assert (w,h)==(1024,expected_h),(path,w,h)
        print('New whole-body hero',hero,state,len(data))
for obsolete in ['puppets','rig','puppet.js','rig.js','gait.js','captured-walk.js','walk-capture.js']:
    assert not (assets.parent/obsolete).exists(),f'Old character assets must not ship: {obsolete}'
