# Balance v3 baseline

The requested baseline is COCKRO v2 +30% required XP, replacing the earlier
Flyff-minus-5% proposal. No Flyff dataset, formula or table is imported. This is
independent tuning toward gradual progression, meaningful equipment and area
combat. It is not an assertion of measured parity with Flyff or greater fun.

| Current level | Old required XP | New required XP | Normal equal-level kills |
| --- | ---: | ---: | ---: |
| 5 | 840 | 1,092 | 19 |
| 20 | 6,120 | 7,956 | 45 |
| 40 | 22,440 | 29,172 | 86 |
| 60 | 51,000 | 66,300 | 133 |
| 120 | 233,240 | 303,212 | 310 |

Requirements use ceil(v2 XP * 13 / 10). Monster XP and gold drops are unchanged;
elite and boss XP remain 3x and 10x. The kill counts exclude tickets and quests.
Required kills rise by roughly 30%, but time per level is not claimed to rise
by 30% because combat is also being retuned.

## Combat

- Base per-level player growth: HP 20 -> 26, attack 4 -> 5, MP 3 -> 4,
  defense 0.25 -> 0.4. This is growth of the base component, not a multiplier
  on all equipment or allocated attributes.
- Monster HP curve: (110 + 65L + 0.25L²) * (1 + 2(1-exp(-(L-1)/10))).
  This reduces long late-game fights for new four-point builds.
- Monster damage: previous curve * 0.9, then rank multiplier and rounding.
  Elite HP remains 2.6x, boss HP 7x; species toughness remains multiplicative.
- Existing allocated points, equipment and premium currency are retained.
- This baseline is extended by the mutation bonuses and smooth enemy scaling documented in progression-20-60.md. Skill cooldowns, paid EXP tickets and currency rewards are unchanged.

## Migration and checks

Balance v2 XP rescales once by newNeed/oldNeed. Version-1 saves use their own
original requirement. A v3 save is a no-op on subsequent load. A level-20 save
with 3,060/6,120 XP becomes 3,978/7,956, keeping the half-full bar. Valid overflow
is retained; migration does not award levels, currency or points by itself.

244 Node tests pass, including a real WebSocket reconnect migration, checks of
all 210 requirement levels, repeated save load across four species and 10 level
boundaries, and preservation of gems, +9 equipment, balances and legacy points.
Syntax check and esbuild server build pass.

An unbuffed four-point reference build with level-appropriate good-quality gear
and the existing upgrade progression survives 8–40 normal same-level hits and
needs between 4 and 35 uncritical basic hits per normal kill at levels 1–210.
These are formula checks, not measurements of human play time. Different gear,
builds, skills, multiple enemies, buffs and PvP require gameplay validation.

The candidate still needs coordinated client/server deployment, complete
assets, browser gameplay and Android updater/device tests. The live patch feed
is unchanged. Job visuals and evolved skill power/names are now integrated; learned flight remains deferred. Earlier hit-count estimates above predate the mutation tuning.
