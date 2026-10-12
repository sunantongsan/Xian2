"""Check shipped WebP atlases without external dependencies."""
from pathlib import Path
import struct
assets = Path(__file__).resolve().parents[1] / 'web' / 'sprites'
files = [f'monsters-{i}.webp' for i in range(10)] + [f'{s}-{g}.webp' for s in ['sword', 'demon'] for g in ['male', 'female']]
total = 0
files += [f'../puppets/{s}-{g}.webp' for s in ['sword','demon'] for g in ['male','female']]
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
print(f'Validated 4 legacy combat, 4 full-body puppet, and 10 monster atlases: {total:,} bytes')

for name in ['town','bamboo']:
    data=(assets.parent/'maps'/f'{name}.webp').read_bytes()
    assert data[:4]==b'RIFF' and data[8:12]==b'WEBP'
    assert struct.unpack('<I',data[4:8])[0]+8==len(data)
    assert len(data)>100000
    print('Painted map',name,len(data))

