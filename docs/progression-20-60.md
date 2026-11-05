# COCKRO progression candidate — not released

The existing game awards 10 attribute points per level. The requested rule is
4 per future level. Existing saves retain their allocated and unused attribute
points through a versioned legacy-level allowance. New characters have no legacy
allowance. Skill-point awards remain unchanged; the requested four-point rule
applies to freely allocated attributes. Hero IDs, equipment and currencies remain unchanged. Balance v3 rescales
current XP once to preserve progress through the level; numeric XP changes
without lowering the level.

Four existing species have three derived job identities, advancing at levels
20 and 60. The roster and character sheet display the current identity from the
level, so existing high-level players need no new character or manual migration.
This is the progression and display foundation: separate job skills, combat
roles, new animation assets and equipment appearance are NOT integrated yet.

Before starting the candidate server, the existing backup utility creates an
immutable before-4.38.0-progression backup. Deploy the authoritative server and
client together: old clients use the ten-point normalization and cannot safely
interpret the new budgets. No production manifest/version is changed here.

## Pending decisions and validation

- The user superseded the Flyff-minus-5% request: required XP is now 130%
  of COCKRO v2, rounded upward, with unchanged monster XP. No Flyff data is
  imported. See balance-v3.md for the combat tuning and validation limits.
- Level-five learned flight, NPC drone/jetpack purchases and movement remain
  unimplemented.
- Three supplied separated-weapon prototypes remain separate; five evolved
  looks, job-specific skills, browser gameplay and physical Android validation
  remain incomplete.
- Native updater/device round-trip is not validated by Node unit tests.

## Validation

New regression coverage checks all 12 job identities at the boundary levels,
returning level-120/210 players, repeated migration, legacy currency/equipment
and XP preservation, multi-level rewards and allocation limits.
