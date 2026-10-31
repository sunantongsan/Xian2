# COCKRO 4.23.0 — Expedition population and town exploration

Forest Lv.1–60: 972 ordinary monsters become 1,167 (+195, rounded up from 20%). Six original bosses remain and forty additional instances use existing boss species, for 46 bosses and 1,213 total creatures. Added bosses occupy forty distinct tiles, spread among all six level bands, outside a 700-world-unit radius of entry checkpoints. These are additional boss instances, not forty newly illustrated species. Existing spawn IDs, creature rewards, character saves and the 4.22.1 handshake fix are retained.

Monster HP bars draw only while HP is below maximum. At full health and after respawn they disappear; target selection rings remain target-only. Monster attack discharge uses a short 0.30-second low-opacity footprint without plasma texture layers or particle rays. Complete windup footprints remain readable for dodging. Player effects retain their existing quality.

Town spawn moves from UV (0.50,0.59) to the painted plaza circle center (0.50,0.445). Shared server/client collision opens the plaza perimeter, both landing-pad promenades, and paths to the existing forest and Lv.61+ exits. Roofs, water and outer scenery remain blocked. No fictional destination or incomplete new stage is exposed.

Validation includes exact population counts, distinct boss territories, safe checkpoint distance, town join/return spawn, traversable paths to both landing-pad edges and exits, texture-free monster discharge and existing connection/reconnect regression tests. Physical Android frame rate remains unmeasured.

## Proposed level incentives — design only, not implemented in this release

Goal: show one clear next milestone, award each milestone once per character server-side, and preserve useful rewards for players who already passed the level. Do not require ads or purchases for the first companion.

| Level | Milestone | Purpose |
| --- | --- | --- |
| 10 | Upgrade materials for one starter enhancement, with tutorial | Demonstrate visible character growth |
| 20 | One free random sci-fi companion, choose one of three revealed results | A memorable first partner without an unlucky unusable roll |
| 30 | Unlock companion training and a quest for its support skill | Improve the same companion through play |
| 40 | Guaranteed choice of a class-specific weapon reward after a boss quest | A concrete combat goal |
| 50 | Companion evolution quest: new appearance and stronger support | A visible reason to continue leveling |
| 60 | Forest champion title and first-map completion reward | Finish the first chapter |
| 61 | Access to the existing Lv.61–120 region | A new exploration goal |

Companion proposal: deploy one at a time; variants are an ion beetle (attack), nano moth (healing) and magnet mantis (loot collection). All grant a small assist attack so each helps leveling. Proposed initial assist power 10–15% of player damage, with shared player XP and kill ownership, no offline farming or separate population target. Define balance through playtests before activation. Training uses boss fragments, so the extra bosses have a longer-term purpose. Duplicate future companions become training fragments; do not erase progress or force repeated rerolls. Preview the exact next reward and XP progress in a compact optional screen, without covering gameplay. Existing characters receive pending milestone claims after server-side migration; repeated/replayed claims must be idempotent.

This proposal needs companion art/animations, authoritative combat and ownership, persistent reward claims, UI and balance validation before it can be described as playable.

## Published verification

- Source commit: 849b2a8584347a23d03ac1980452e6e120cbe448.
- Vercel production dpl_2CA7gViiMb44o1mm8Jg51agSk53Q READY; https://cockro-game-updates.vercel.app .
- VPS workflow https://github.com/sunantongsan/Xian2/actions/runs/41156796015 succeeded, including two-player live world smoke.
- Live health reports release 4.23.0, forestPopulation 1213, forestBosses 46.
- Downloaded patch ZIP SHA-256 verified: 39df9cc2a428f6e5a80598c97c7d92096719a4f8067deda447adc2fd1d53ab15 (20,787,858 bytes); inspected published population and town spawn code.
- 151 local tests pass; game and bundled server syntax pass.
- Browser: existing QA4221 character re-entered from the 4.23.0 roster; world rendered online at the central landing circle. Screenshot: review/cockro-4.23-town.jpg.
