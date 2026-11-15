# Desert Kingdom — level 61–120 map

Replaces the advanced `star` map in the COCKRO branch with a desert region. Keeps map ID, existing monster identities, stats, drops and all-level access. Based on `feature/mantis-four-directions-4481`, not the unrelated Xian2 main branch.

- 384 × 384 tiles at 48 world units per tile: 18,432 units per side; four times the old bounding area. This is an original scale choice. Exact physical equality with Flyff Saint Morning has NOT been established.
- Twelve five-level habitats covering every level 61–120; 432 camps / 818 spawn slots, including six bosses. Uses the existing twenty advanced monster species.
- Oasis city, palm gardens, dunes, termite hills, ancient oasis, glass sand basin, caravan graveyard, scorpion canyon, lost city, sun hive, kings canyon and sun temple.
- Sandstone city buildings with solid foundations, protected oasis, palms, cacti and sandstone formations. Cached procedural scenery; this is not newly painted premium environment art.
- Every camp and gate is reachable on foot. Main roads remain clear. Chunk cache and screen culling stay bounded rather than rendering the full expanded map.
- Shared 1,080-unit city safe radius. Old star positions migrate once to the oasis spawn; revised positions persist across reconnects. Existing progress and inventory remain intact.

## Validation

21 focused Node tests passed: city collision, service and gate routes, spawn/level coverage, all-level access, old-save migration, reconnect, combat and adjacent maps. Renderer output was inspected at city, canyon and temple viewpoints using Canvas. No physical Android performance or live deployment is claimed.

Regenerate: `node tools/gen-hero-star.mjs`.
Check: `node --test tests/desert-world.test.js tests/hero-star.test.js tests/advanced-world.test.js tests/maps.test.js tests/account-roads.test.js`.

## Release requirement

Deploy the server with the same generated map and shared modules as the client patch. Do not publish the client map alone: old server coordinates/collision would disagree. This branch is a reviewable implementation; no signed patch or production server has been updated by this change. Compare the target production branch before merging because main is a different prototype.
