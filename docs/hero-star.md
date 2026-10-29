# ดาวฮีโร่ (Hero Star) — open world 1–60 (content 4.6.0)

A large 2.5D sci-fi planet for the insect heroes: 192×192 isometric tiles (about 14,700 projected units across), floating in space. Enter from **ยานสู่ดาวฮีโร่** at Aurora station, **แผนที่ → ดาวฮีโร่**, or the minimap. The existing ป่าชีวะแสง forest is unchanged and still available.

| เขต | ชื่อ | Lv. | | เขต | ชื่อ | Lv. |
|---|---|---|---|---|---|---|
| 1 | ลานจอดยานฮีโร่ | 1–5 | | 7 | สุสานหุ่นรบ | 31–35 |
| 2 | ป่าเห็ดเรืองแสง (boss) | 6–10 | | 8 | หุบรังแมงป่อง (boss) | 36–40 |
| 3 | ทุ่งสปอร์อำพัน | 11–15 | | 9 | นครนีออนร้าง | 41–45 |
| 4 | เนินรังปลวกยักษ์ (boss) | 16–20 | | 10 | รังผึ้งเหล็ก (boss) | 46–50 |
| 5 | หนองน้ำกรด | 21–25 | | 11 | รอยแยกพลังมืด | 51–55 |
| 6 | ป่าคริสตัลไซเบอร์ (boss) | 26–30 | | 12 | แกนดาวเพลิง (boss) | 56–60 |

- Outer ring → inner ring → core; zones are split by chasms open to space and linked only to the next zone by roads and energy bridges.
- ~260 camps (~530 aliens, 1–3 per camp) using `alien-forest.webp`; each camp has the exact catalog level (ids 1000–1059), levels rise away from each warp gate, every level 1–60 has camps. The six existing bosses (1060–1065) live in zones ending on 10/20/…/60; other zones have an elite pack leader. Respawn 8–13 s (elite/boss 40 s); only camps near the hero are simulated; monsters leash home past 650 units.
- Warp gate per zone, usable from the zone's minimum level.

Files: `web/maps/hero-star.json` (Tiled 1.10 isometric: `ground`, `props`, `zones`, objects `spawns`, `pois`), `web/tilemap.js`, `web/star-render.js` (procedural ground chunks, cliff faces, props, gates, starfield, minimap — no new bitmaps), `web/star-data.js`. Regenerate with `node tools/gen-hero-star.mjs [seed]` or edit in Tiled. Tests: `tests/hero-star.test.js`.

Limitations: procedural vector scenery, not painted art; no saved position inside the planet (Continue starts at the station); physical-phone frame rate untested (Settings → low quality helps).
