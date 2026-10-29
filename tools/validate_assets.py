"""Validate production WebP containers and reject retired scenery in shipped assets."""
from pathlib import Path
import struct
web=Path(__file__).resolve().parents[1]/'web'
for name in ['maps/aurora-outpost.webp','maps/biolume-tile.webp','sprites/alien-forest.webp','heroes/cockro-combat-v2.webp','ui/hero-menu-atlas.webp','heroes/demon-scorpion.webp']:
 data=(web/name).read_bytes()
 assert data[:4]==b'RIFF' and data[8:12]==b'WEBP',name
 assert struct.unpack('<I',data[4:8])[0]+8==len(data),name
 assert len(data)>10000,name
 if name=='sprites/alien-forest.webp':assert data[12:16]==b'VP8X' and data[20]&16,'Alien sprites need alpha'
 print(name,len(data))
for name in ['maps/town.webp','maps/bamboo.webp']+[f'sprites/monsters-{i}.webp' for i in range(10)]:assert not (web/name).exists(),name
assert (web/'assets/NotoSansThai.ttf').is_file()
import json
star=json.loads((web/'maps/hero-star.json').read_text(encoding='utf-8'))
assert star['orientation']=='isometric' and star['width']>=160 and star['height']>=160
assert {'ground','props','zones','spawns','pois'}<={l['name'] for l in star['layers']}
assert len(next(t for t in star['tilesets'] if t['name']=='hero-star-zones')['tiles'])==12
print('Hero Star Tiled map',star['width'],'x',star['height'])
