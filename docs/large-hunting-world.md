# COCKRO 90: expanded hunting world

The previous forest had six clearings with three packs in each. This revision retains the level 1–60 bands but gives each band nine full-size clearings. World dimensions are 14400 × 9600, nine times version 89's total area. Existing terrain textures are reused at their original tile scale; this is not new bespoke terrain artwork.

- 162 hunting packs, six monsters per pack, plus six bosses: 978 persistent spawn slots.
- Camp members are spaced around a 165-unit ring and share a species/level. Nearby AI only; distant enemies sleep, offscreen actors are culled.
- All 162 camp centers have routes from the forest entrance. Low-level packs remain near each checkpoint. A route across the first three region centers is approximately 77 seconds at base walking speed.
- Trail signs show exits; the top-center minimap shows connected clearings, level bands and player location. Tap it to open travel controls.
- Opening energy wave has a wider hit area; whirlwind and field have shorter cooldowns and adjusted energy costs. Animation layers use world-space geometry plus existing texture frames. New unlocked skills fill empty slots without replacing equipped skills.

Validation: 42 Node tests; browser creation/travel/movement/save reload, three skill screenshots, minimap opening; Android unit tests, lint, APK asset and signature checks in CI. The headless browser performance result is not a phone benchmark.

Limitations: only the existing Cockro hero is playable; other classes remain unavailable. Existing repeated terrain and sprite art remain. This offline preview is not a production-quality equivalent of MU. No physical Android device test or Play Console upload is claimed. Preview APK uses its existing preview signing key; AAB remains unsigned. ZIP patch requires manual import into compatible engine 88 or newer.
