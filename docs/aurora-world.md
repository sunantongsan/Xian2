# Aurora world patch 4.4.1 (APK 89, native patch engine 88)

Replaces the old cultivation village and all ten old hunting maps with the Aurora expedition outpost and one connected alien forest. The forest is 4800 × 3200 projected world units, versus 2000 × 1333 previously (5.76× area). Six regions cover 1–10, 11–20, 21–30, 31–40, 41–50 and 51–60. Checkpoints require the region's starting level; all areas remain physically connected. Existing levels, currencies, stat allocations and old bestiary records survive; old map indices return to current world 0.

There are three alien sprite archetypes with 60 level definitions and six boss variants, not 66 distinct character designs. Population is 108 regular enemies in packs of six plus six bosses. Regular respawn is seven seconds, boss respawn 25 seconds, postponed or repositioned when the player is too close. Distant AI sleeps beyond 1100 units. Navigation has a collision-checked direct-line fast path. Rendering culls offscreen enemies and crops only visible terrain. Forest repeats a detailed tile six times, retaining sharpness without a giant bitmap. Native memory and FPS on a real low-end phone remain unverified.

Cockro receives six area-focused techniques across levels 1, 5, 12, 25, 40 and 55. They reuse the existing effect renderer; this is not a final MU-grade VFX pass. Other three new classes remain unavailable pending their combat assets. Combat animation remains experimental, online play and automatic patch download remain separate unfinished work.

## Art provenance
Generated with the built-in image generation tool, then converted to WebP. Final assets:
- `web/maps/aurora-outpost.webp`: white/navy/gold sci-fi village around a clear plaza, trading pod left, robotic workshop right, training dome north, teleporter south; alien luminous flora; no baked characters or text.
- `web/maps/biolume-tile.webp`: square seamless alien clearing tile, dark violet floor, four open midpoint exits, cyan umbrella mushrooms and luminous foliage only in corners; no characters, no labels, no HUD. Repeated as a 3 × 2 terrain grid; collision polygons are authored in tile-local coordinates.
- `web/sprites/alien-forest.webp`: transparent 3 × 4 atlas; columns amber energy droplet, orange three-legged crystal beast, coral/ivory floating bloom; rows idle, walk A, walk B, attack. Warm colors contrast with violet terrain; dark shadows and ground rings reinforce silhouettes.

The earlier overview concept was not shipped as the playable terrain: scaling it to a large world reduced detail. No old village or monster atlas ships in this build. Their previous revisions remain in Git history.

## Validation
- `npm test`: geometry, route continuity, 114 spawn slots, respawn spacing, old-save migration, opening pack difficulty, combat and skill behavior.
- `python3 tools/validate_assets.py`: WebP container integrity, sprite alpha and absence of retired atlases.
- `node tools/browser-smoke.mjs` with Playwright: 844×390 viewport, new hero, outpost, checkpoint UI, forest, movement, return and saved-game reload; rejects JS errors/missing resources.
- `tools/render-alien-review.mjs`: software renders using the actual game canvas renderer for visual inspection.
- Android pipeline compiles, runs patch archive tests, lint and APK signature verification, then packages a ZIP compatible with installed APK 88.

Install the ZIP through the native Patch button. This build does not introduce server-driven automatic patch updates.
