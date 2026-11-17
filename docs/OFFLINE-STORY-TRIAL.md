# COCKRO MAN — 30-stage offline trial (4.51.0)

Existing Store application: com.sunantongsan.networkcokcro (native versionCode 114). Based on release/evolution-wings-4502. The live 4.50.2 archive SHA-256 was verified and game.js matches the branch base.

## Player flow

Open “ทดลองเนื้อเรื่อง • ออฟไลน์” from the main welcome screen, then “เล่นต่อ / เริ่มผจญภัย”. Start in Thung Kula town. Tap the guide/objective button to choose a stage. Kill all enemies and collect the mission objects where applicable, then enter the end marker to warp back to town. Claim the reward from ไกด์แสงดาว to unlock the next stage. Town provides supplies, equipment upgrades, and free class changes at levels 20 and 60.

30 stages use pairs 1–2 through 59–60. There are 12 hunt, 12 collection, and 6 boss missions. Bosses occur every five stages. Existing terrain is reused with three bounded paths and their reverse directions; these are not 30 new map artworks. Difficulty increases through monster level, HP, damage, and enemy count. First-clear rewards include G, upgrade materials and catch-up XP. Replay rewards are reduced. Monster loot and combat use the existing engine.

The trial uses a separate local save, cockro-story-test-v1, envelope version 2. It does not import online balances or characters. Pending rewards, kills and quest objects survive restart. Returning to a stage restores health at the starting checkpoint; cleared enemies stay cleared. Old one-stage trial saves retain their character and begin this campaign in town. Gameplay does not require a server; the native shell may still check updates at startup. No ads or real-money shop are enabled in this route.

## Stage list

| Stage | Monster levels | Mission | Objective |
|---|---|---|---|
| 1 | 1–2 | ออกจากเมือง | Defeat enemies |
| 2 | 3–4 | สมุนไพรริมทาง | สมุนไพร ×3 |
| 3 | 5–6 | ฝูงแมลงขวางทาง | Defeat enemies |
| 4 | 7–8 | เสบียงตกหล่น | กล่องเสบียง ×3 |
| 5 | 9–10 | ผู้เฝ้าทาง | Boss + guards |
| 6 | 11–12 | ตามรอยคาราวาน | Defeat enemies |
| 7 | 13–14 | ชิ้นส่วนเครื่องนำทาง | ชิ้นส่วนเครื่องนำทาง ×3 |
| 8 | 15–16 | ทางแยกอันตราย | Defeat enemies |
| 9 | 17–18 | กล่องเสบียงคาราวาน | กล่องเสบียง ×3 |
| 10 | 19–20 | จ่าฝูงผู้ปล้นเสบียง | Boss + guards |
| 11 | 21–22 | รอยเกราะโบราณ | Defeat enemies |
| 12 | 23–24 | ผลึกซ่อมเกราะ | ผลึกซ่อมเกราะ ×4 |
| 13 | 25–26 | แนวป้องกันแมลง | Defeat enemies |
| 14 | 27–28 | บันทึกช่างเกราะ | บันทึกช่างเกราะ ×4 |
| 15 | 29–30 | ผู้พิทักษ์เกราะ | Boss + guards |
| 16 | 31–32 | เส้นทางที่ถูกลืม | Defeat enemies |
| 17 | 33–34 | แผนที่ส่วนแรก | ชิ้นส่วนแผนที่ ×4 |
| 18 | 35–36 | ฝูงเฝ้าแผนที่ | Defeat enemies |
| 19 | 37–38 | แผนที่ส่วนสุดท้าย | ชิ้นส่วนแผนที่ ×4 |
| 20 | 39–40 | ผู้เฝ้าหอจดหมายเหตุ | Boss + guards |
| 21 | 41–42 | ตามแสงปีกแก้ว | Defeat enemies |
| 22 | 43–44 | เศษปีกเรืองแสง | เศษปีกแก้ว ×5 |
| 23 | 45–46 | ทางผ่านฝูงพิษ | Defeat enemies |
| 24 | 47–48 | ผลึกเปิดทาง | ผลึกเปิดทาง ×5 |
| 25 | 49–50 | ราชินีปีกแก้ว | Boss + guards |
| 26 | 51–52 | ก่อนถึงประตูสมบัติ | Defeat enemies |
| 27 | 53–54 | ตราประตูชิ้นแรก | ตราประตู ×5 |
| 28 | 55–56 | ฝ่าด่านผู้พิทักษ์ | Defeat enemies |
| 29 | 57–58 | ตราประตูชิ้นสุดท้าย | ตราประตู ×5 |
| 30 | 59–60 | ผู้เฝ้าประตู COCKRO | Boss + guards |

## Validation and delivery

Run node --test tests/*.test.js and node --check web/game.js. The campaign tests simulate all 30 clears, actual map pathfinding, save restoration, reward idempotence, offline class progression and real gear upgrades. The runtime test exercises actual game handlers with a stub DOM and image loader; it is not a browser visual test. Installed Chromium cannot launch in this host because the process singleton socket is denied. Android touch, rendering and airplane-mode startup still need device testing.

Build using python3 tools/build_update_feed.py. This creates a complete hash-verified native bundle and sparse feed. Do not package only changed JavaScript as a full native ZIP. No APK/AAB or GitHub Actions job is needed for these web-content changes. Deployment status must be checked separately; this document does not itself assert a published patch.

## Release verification (2026-11-17)

- Local targeted suite: 84 passed. Full repository suite on Vercel: 352 passed, 0 failed.
- Remote 4.51.0 bundle verified: 272 file hashes. SHA-256 bfe6eeb6746dde522a8753339fc3a5e043c20f2d4a24cf39390974ed27c1ca8a.
- Cloud browser: loaded the title, entered town, opened the guide, entered stage 1, returned to town and confirmed the resume option. No game-origin console errors observed. This does not replace Android touch or full gameplay testing.


## 4.52.0 — story campaign becomes the default

The main index now enters the local campaign directly. The same isolated save is retained; online account tokens, paid balances and server characters are not deleted or imported. This release removes player simulations from the active game by never connecting the campaign to the online world and clearing the remote player list. Decorative town crowds are also suppressed; three service NPCs remain.

The hub uses a 1600 × 1066 map with a small central walkable plaza. Guide, merchant and blacksmith are all reachable within 500 world units of spawn. Stage order remains quest-gated. Six chapters now explain the caravan, missing map, insect armour, glass wings and COCKRO gate, with mission briefings and completion dialogue.

New players learn movement, accepting a quest, combat, claiming the first reward, a real guaranteed +1 weapon upgrade costing 500 G and one alloy, and proximity item collection. Steps advance on actual actions, survive restart, and gate stage 2 until the upgrade lesson. Previous trial players with clears retain progression and are not forced to repeat teaching; active first-stage saves resume the combat lesson. An optional gold chest in each stage gives G and one HP potion once per run. The first-clear reward, upgraded weapon, quest collection and chest state all persist independently.

Presentation adds a light cream/mint quest UI, coloured chapter paths, sparkling pickups, visible tutorial highlights and labelled pulsing return portals. Particle counts are bounded (4 at low quality, otherwise 10). Existing map and character art are reused.

Validation: campaign progression and actual runtime tests include full 30-stage logic, tutorial gating, town-service pathfinding, chest idempotence, resume/migration, and preservation of online keys. Browser and production verification are recorded in the delivery response.


## 4.53.0 — one-tap quest assistance

The main quest text now toggles automatic quest execution instead of opening a journal. The character walks using existing navigation, accepts the introductory quest, travels, fights with the real auto-hunt/skill/potion system, collects required objects, enters the exit portal, walks to the guide, and claims the normal reward once. Automation stops after reward collection; another tap starts the next objective. The required first weapon upgrade uses its real 500 G / 1 alloy cost; insufficient resources stop the flow. Class-branch selection remains a player decision.

Tapping the quest again, manual ground/joystick/keyboard movement, death, leaving for town manually, or returning to title stops assistance. Opening a menu pauses it. Reloading does not resume assistance or auto combat. No native rebuild or Actions workflow is required.

Validation includes an actual runtime simulation from a new save through stages 1 and 2 with real movement and damage (no teleporting or forced kills), automatic rewards and +1 upgrade, and manual joystick cancellation. Existing legacy-save isolation and reward idempotence tests remain.
