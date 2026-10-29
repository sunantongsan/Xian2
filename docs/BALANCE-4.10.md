# Combat and economy candidate

This is a source candidate based on fashion-4-9 d7cffbc, not a deployed release. It changes neither character art nor animation. The full-character outfit and rewarded-ad system is separate work.

Currency: remove stone rewards and convert saved stones once at the existing shop exchange value of 1,000 gold each. Keep current gold and player level. Preserve the fraction of XP completed within the current level when migrating to balanceVersion 2. Legacy saves receive five MP potions. Starting gold remains 100,000 to avoid silently changing the existing economy; therefore early purchases are cheap relative to starting wealth.

Normal monster HP = round((110 + 65L + 1.4L²) × (1 + 3 × (1 − exp(−(L−1)/10)))). Damage = round(12 + 5L + .09L²), before player defense. Species retain their toughness, speed and attack patterns. Elite HP ×2.6, damage ×1.2, XP ×3; boss HP ×7, damage ×1.65, XP ×10. Fixed level-based stats do not scale with the player's equipment, so upgrades retain their value.

Normal XP = 20 + 8L. XP required = normal XP × round(8 + 1.2L + .006L²). Same-level normal kills per level: 9 at L1, 21 at L10, 49 at L30, 102 at L60, 165 at L90, 238 at L120. Current maps cover 1–120, although the existing player cap remains 210. No new endgame content is included.

Skills: cooldown ×0.8 (minimum 1.5 seconds before quick modifier), modifier MP surcharge reduced from 8 to 4. MP regen 6.5 + min(6, INT × .02) per second. All four starting class skills can be sustained; rotating several skills spends reserves and makes MP potions useful. MP potion costs 60 gold, restores 50%, cooldown 6 seconds independent of HP potion. Server rejects use when dead, full, empty or on cooldown and purchases outside town/home. HP potion remains 50 gold, 50%, cooldown 4 seconds. Mobile MP button plus T shortcut; labeled red HP, blue MP, yellow EXP bars.

## Evidence and limits

Run `node tools/balance-report.mjs` to reproduce balance-estimates.csv. Representative build allocates 4 STR / 3 VIT / 2 INT / 1 AGI per level, equips blue gear at its level tier, and trains the first three skills within its point budget. Estimates use average stationary DPS including cast time opportunity cost, but omit travel, misses, critical skill variation, area damage and damage over time. They are not measured time-to-kill. Unspent builds deliberately struggle; gear and skill training should be taught clearly in playtesting. Species toughness changes kill time by 0.75–1.7×.

41 targeted automated tests pass (core, progression, skills, runtime, advanced world, gear, auto-hunt and balance). Tests include one-time migration, purchase boundaries, authoritative MP use and 480 class/level cases. Real phone layout and full live server/ad tests have not been run. Existing online field-skill handling differs from offline repeated ticks and needs separate parity work before claiming identical combat balance. The backend bundle was rebuilt successfully. Full suite: 78 pass, one asset-presence test blocked because hero WebP assets were not downloaded into this working copy. Online integration tests pass. Stage both client and bundled backend and run live smoke tests before release; do not publish this client against the old backend.
