# COCKRO 4.22.0 — Living forest

Changes: painted plasma VFX with four class palettes and four animation phases; travelling effects use authoritative range/target and dash origin is preserved. Added 20 painted forest species with 20 different shared attack footprints, visible windups and textured discharge. Original wildlife and six bosses remain. 978 total forest creatures are dispersed through all 54 terrain tiles. Forest interiors allow off-road traversal; outer map boundaries and town collision remain. Wildlife wanders, pauses, returns to its own territory and animates gait/breathing/hovering.

Validation: 146 Node tests, including all 20 authoritative skill footprints, persistent bestiary IDs, off-road collision, distribution, wandering and dash/arrow origins. Server bundle syntax and game syntax checked. Patch contains WebP assets only, retains engine 88 / minimum native build 100. Hosted browser review identified atlas bleed; corrected source bounds and a padded replacement sheet remove neighboring creature fragments. Android device performance is not yet measured.

New raster assets created with built-in imagegen:
- `web/sprites/forest-bestiary.webp`: 4 columns × 5 rows, isolated isometric sci-fi insect/alien creatures, painted chitin and mechanical armor with luminous cores. Ordered crystal scarab, photon mantis, spore moth, coil spider, reactor snail, drill worm, titanium wasp, acid scorpion, prism crab, ion dragonfly, magnetic toad, furnace golem, plasma jellyfish, sonic bat, laser cobra, siege turtle, mechanical pitcher plant, gravity cyclops, magma centipede, solar phoenix. Background extraction pass preserves the same arrangement and removes colored background using alpha.
- `web/vfx/plasma.webp`: 4 columns × 4 rows, four animation phases per class: orange plasma crescent, emerald nanite vortex, cyan ion arrow, gold sonic shockwave; layered turbulent particles, bright cores and fine wisps on alpha; no weapons or text. Converted to WebP with alpha preserved.

The atlas uses procedural breathing, cast anticipation, hovering and gait transforms; it is not a full directional skeletal animation set. Preview pages: `forest-preview.html`, `combat-preview.html`.

- `web/sprites/forest-apex.webp`: separate isolated magma centipede and white-gold solar phoenix, full articulated body and swept wings/tail, painted isometric sci-fi style on alpha. Generated as a two-creature atlas with wide spacing to preserve silhouette edges.

## Published validation — 2026-10-31

Production source: `f46e56ad99d3b0947285b1578937c42e584dccde`.
Vercel deployment `dpl_Fvw9AiEaqcCJMaU7S4dEVUPUpmtY` is READY on https://cockro-game-updates.vercel.app .
Production patch: 20,787,630 bytes; SHA-256 `06542d8282d3dd5d74344c30988fcccbf011c592038e226aef71519f1b4101db`; downloaded archive and all 100 manifest entries verified.
Server release workflow https://github.com/sunantongsan/Xian2/actions/runs/41150703910 succeeded: 81 server-host tests, bundle validation, fixed service deployment, two-player live socket smoke and unsigned SSV rejection. Main deployment commit: `b8705b4f0a34859341042093dfafe8f39e343cc4`.
External health reports release 4.22.0, forestSpecies 20, forestRoaming true and capacity 64. Live smoke verifies shared movement/monster HP and reconnect persistence. Full local suite: 146 passed. Hosted final bestiary reviewed with all twenty creatures visible, including separate apex silhouettes.
Desktop simulation with 64 players / 978 forest creatures averaged 4.8 ms per tick over 100 ticks; this is not a VPS or Android performance guarantee.
Open the installed app again to fetch 4.22.0. No new native bundle is required for this release. Physical Android performance and subjective MU-quality comparison remain unverified.
