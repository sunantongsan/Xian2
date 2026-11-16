# Insect suit professions — draft, not deployed

Based on 4.50.0 `feature/oasis-city-seamless` at ea062c76338f81cb2e67cc41e824ed376d86d94b.

New characters start as ordinary humans. Existing hero IDs remain accepted for save compatibility, but do not determine the new profession. At level 20, the authoritative server derives the profession from the equipped, recognized full-body insect suit. Male and female suits share one profession. No suit means no promotion. The notice opens the same promotion UI directly; the NPC path checks town proximity. Both require a living character outside the existing PvP combat cooldown.

Promotion grants all five insect skills in the five action slots and one tier-20 normal weapon in the bag, exactly once. A full bag blocks the entire operation without changing state. Additional weapons remain loot/shop equipment. The gift's weapon type is serialized through equipment, trades and saves. At level 60, the existing insect profession advances, the same five skills gain the existing advanced power multiplier, and cosmetic wings appear. Changing armor after level 20 does not change the locked profession. Wings are derived from completed advancement, have no item or shop entry, and do not unlock flight.

| Insect | Starter weapon | Five skills |
| --- | --- | --- |
| Cockroach | Chitin Sword | Chitin Slash, Carapace Whirl, Survivor Rush, Survivor Recovery, Chitin Storm |
| Ladybug | Guardian Mace | Spotted Strike, Guardian Ring, Restoring Blessing, Repelling Wave, Sacred Garden |
| Scorpion | Venom Daggers | Venom Sting, Shadow Pincers, Ambush Dash, Numbing Blades, Desert Venom |
| Beetle | Horn Hammer | Horn Smash, Earthbreaker, Horn Charge, Iron Shell Recovery, Quake Field |
| Dragonfly | Gale Bow | Gale Arrow, Lightning Arrow, Scattershot, Repelling Gust, Dragonfly Rain |
| Mantis | Twin Sickles | Crossed Sickles, Flash Cut, Sickle Dance, Frost Edge, Razor Storm |

Skills reuse the shared damage, healing, elemental status, mana and cooldown machinery in PvE and PvP. Custom recipes remain separate from the five profession skills. Wings are bounded canvas shapes tinted by profession (dragonflies have two pairs), drawn behind the actor; existing suit sprites and walk frames are reused.

## Migration needing review before release

Version-1 profession progress becomes unassigned version-2 progress. Level, currencies, inventory and equipment remain, but an existing character must choose the insect career through a suit promotion. A level-60+ character can complete both steps. The current mutation EXP gate still applies; pending characters lose overflow EXP under the pre-existing gate behavior. Old skill allocation is refunded through normalization; level-20 promotion equips the five new skills and refunds its skill budget. The old stat refund at promotion remains. This migration is not approved as production-safe by these tests alone.

The server startup uses a distinct pre-migration backup label `insect-professions-v2`. Source and server must be released together. The checked-in server bundle and release feeds are deliberately NOT updated by this draft; rebuild with `npm ci && npm run build:server` only after validation, then package the same source revision for client and server. No VPS, release feed or store was changed.

## Verification

- 34 focused tests pass: suit-profession, suit-profession-socket, full-suits, commerce, offline-presence, oasis-town and gear suites.
- Every one of the ten suits: level gate, suit-derived profession, five distinct skills, one weapon, persistence, fixed profession and level-60 wings.
- All 30 skills consume mana and enforce cooldowns in server PvE; all 30 are accepted by the server PvP path.
- Real WebSocket promotion, server restart and reconnect preserve the career and prevent a duplicate gift.
- Full-bag and invalid-suit requests are atomic. Dead/combat requests are rejected. NPC distance and notice paths are separately covered.
- JavaScript syntax and server bundle build pass. Existing duplicate Thai translation-key warning remains.
- Full historical suite is NOT green: first broad run had 312 passes and 42 failures; comparison with the unchanged downloaded baseline found 5 failures already present (missing artwork/fixture files). Other failures include old six-skill/human-branch assumptions and legacy save/progression contracts. These need explicit adaptation/review before release; focused tests do not replace that review.
- Actual in-game wing appearance, mobile UI and physical Android performance are not visually validated. No production-ready claim.
