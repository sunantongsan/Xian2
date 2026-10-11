# Road to Immortality — ถนนสู่เซียน

Offline isometric cultivation action RPG prototype. Not yet a production-ready or Play Store approved release.

## Play locally

Run `npm run serve`, then open http://localhost:8080. No npm packages are needed for the game.

- Four selectable heroes: male/female Sword and Demon sects.
- Hero atlases connected to idle/walk, attack, skill, hurt and death states.
- 100 Chinese fantasy monsters in ten regions, including ten bosses.
- Every monster has an idle pose and an attack pose connected to its combat state.
- Tap to move or target; keyboard WASD/arrows, Space attack, Q skill, E dodge, R potion.
- Town, shop, weapon upgrades, level progression, local save and bestiary.
- Transparent WebP atlases, region-based loading and bundled Thai font for offline display.

## Verify

`npm test` and `npm run check`

`python3 tools/validate_assets.py`

## Current art limitations

Hero animation uses the existing 6×4 sheets with mirrored left/right facing, not eight-direction animation. Monster sheets use a 5×4 layout: rows 0/2 are idle, rows 1/3 are attack. Each monster currently has two poses, not a complete walk/attack frame sequence. The ten regions use prototype scenery. Online play and release Android packaging are separate unfinished work.

## Assets

The game consumes only `web/sprites/*.webp`, plus Noto Sans Thai and its accompanying open-font license. Each `monsters-N.webp` contains the ten monsters of region N, indexed by `zone` and `slot` in `web/catalog.js`. Character filenames match hero IDs. The assets were generated for this project.

## Skill system

The Skills menu contains five techniques per sect, unlocked at levels 1/20/40/60/120. Equip up to three; use the touch buttons or keys 1/2/3 (Q also casts slot 1). Mana regenerates at 5 per second, and each technique has its own cooldown.

At level 60, craft a named technique from wave/circle/bolt/dash/field, one of five elements, and up to one modifier. At level 120, use two distinct modifiers. Fire/poison deal damage over time, ice slows, wind pushes and lightning increases direct damage. Modifiers implement piercing, life drain, wider area, higher power, faster casting cooldown, and longer status duration. Fields pulse four times. Life drain is capped per cast; damage-over-time effects of the same element refresh instead of stacking.

Buy ingredients for G in town. Crafting validates level, ingredient counts and money before deducting any resource. Recipes, ingredients and equipped slots persist in old or new saves. Current version has ten recipe slots; editing existing recipes, training-dummy preview and chained advanced techniques are not implemented yet. Skill effects are lightweight procedural effects using the existing hero cast animation, not new raster sprite sheets.
