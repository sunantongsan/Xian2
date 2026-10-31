# COCKRO 4.22.0 — Living forest

Changes: painted plasma VFX with four class palettes and four animation phases; travelling effects use authoritative range/target and dash origin is preserved. Added 20 painted forest species with 20 different shared attack footprints, visible windups and textured discharge. Original wildlife and six bosses remain. 978 total forest creatures are dispersed through all 54 terrain tiles. Forest interiors allow off-road traversal; outer map boundaries and town collision remain. Wildlife wanders, pauses, returns to its own territory and animates gait/breathing/hovering.

Validation: 146 Node tests, including all 20 authoritative skill footprints, persistent bestiary IDs, off-road collision, distribution, wandering and dash/arrow origins. Server bundle syntax and game syntax checked. Patch contains WebP assets only, retains engine 88 / minimum native build 100. Browser rendering requires the hosted preview because this workspace denies Chromium's local singleton socket. Android device performance is not yet measured.

New raster assets created with built-in imagegen:
- `web/sprites/forest-bestiary.webp`: 5 columns × 4 rows, isolated isometric sci-fi insect/alien creatures, painted chitin and mechanical armor with luminous cores. Ordered crystal scarab, photon mantis, spore moth, coil spider, reactor snail, drill worm, titanium wasp, acid scorpion, prism crab, ion dragonfly, magnetic toad, furnace golem, plasma jellyfish, sonic bat, laser cobra, siege turtle, mechanical pitcher plant, gravity cyclops, magma centipede, solar phoenix. Background extraction pass preserves the same arrangement and removes colored background using alpha.
- `web/vfx/plasma.webp`: 4 columns × 4 rows, four animation phases per class: orange plasma crescent, emerald nanite vortex, cyan ion arrow, gold sonic shockwave; layered turbulent particles, bright cores and fine wisps on alpha; no weapons or text. Converted to WebP with alpha preserved.

The atlas uses procedural breathing, cast anticipation, hovering and gait transforms; it is not a full directional skeletal animation set. Preview pages: `forest-preview.html`, `combat-preview.html`.
