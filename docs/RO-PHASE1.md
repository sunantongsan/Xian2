# COCKRO MAN — RO-style field prototype (phase 1)

Standalone page: `web/ro/index.html` (Three.js r170 copy in `web/ro/three.module.js`). Does not touch the live game, server, ads or Android shell.

## Included
- 2.5D view: 3D field, fixed tilted camera, 2D billboard sprites with blob shadows (RO feel). Tap ground to walk, tap monster to auto-attack, tap item to pick up, pinch/wheel zoom.
- RO-style stats STR/AGI/VIT/INT/DEX/LUK, stat cost floor((x-1)/10)+2, points per level floor(lv/5)+3, Base/Job level, HIT/FLEE/CRIT/ASPD, death EXP penalty 1%, sitting regen.
- Novice → Job Lv10 → Swordman / Thief / Archer / Merchant, each with its own weapon type and 2 skills (+ First Aid).
- Field "ทุ่งกุลา 01": 6 monster species (2 aggressive), respawn, MVP "ราชันย์ตะขาบเพลิง" (first at 2.5 min, then every 10 min).
- Ground drops with % tables; equipment (head/body/feet/acc) and potions; inventory/equip window.
- COCKRO coin: rare drop 1.5–3% per normal kill (1 coin), MVP 100% (6–14). Thief "ฉกเหรียญ" 1.2%.
- AUTO hunt (level-aware target, auto red potion), juice: hit-stop, flash, knockback, sparks, screen shake, bouncing damage numbers, level-up pillar, BGM + SFX.

## Not yet (later phases)
- Progress/coins are localStorage only — NOT server-authoritative. Before real coins or blockchain, drops must move to the server.
- Job-specific hero sprites (all jobs use the sword COCKRO sprite), town/NPC/storage/warp, cards, refine, party, guild.
