# วิถีเชียน

Current test version: **0.1.5**. All four playable heroes have been redrawn and use continuous full-body animation, including articulated shoulders, elbows, hips, knees, torso and sash. See [character redraw notes and prompts](docs/character-redraw.md) and [animation preview](docs/new-character-walk.mp4). Older version notes below describe superseded artwork.

Offline isometric cultivation action RPG prototype. Not yet a production-ready or Play Store approved release.

## Play locally

Run `npm run serve`, then open http://localhost:8080. No npm packages are needed for the game.

- Four selectable heroes: male/female Sword and Demon sects.
- Hero atlases connected to idle/walk, attack, skill, hurt and death states.
- 100 Chinese fantasy monsters in ten regions, including ten bosses.
- Every monster has an idle pose and an attack pose connected to its combat state.
- Analog left joystick (independent multi-touch), tap to move or target; keyboard WASD/arrows, Space attack, Q skill, E dodge, R potion.
- Town, shop, weapon upgrades, level progression, local save and bestiary.
- Transparent WebP atlases, region-based loading and bundled Thai font for offline display.

## Verify

`npm test` and `npm run check`

`python3 tools/validate_assets.py`

## Current art limitations

Walking now uses painted cutout parts with a two-bone leg rig, front/back artwork mirrored for four facings. Both legs alternate through contact, weight bearing, passing, swing and opposite contact. The gait is tied to actual travel distance. Legs are solved in the vertical walking plane before isometric projection so camera depth does not force a crouch. Foot placement cancels root displacement during the stance phase; start/stop blends into a resting pose. Body scale and hip anchors stay fixed. Combat retains the original 6×4 sheets. This is a lightweight 2D rig, not a full 3D character animation system. Monster sheets use a 5×4 layout: rows 0/2 are idle, rows 1/3 are attack. Each monster currently has two poses, not a complete walk/attack frame sequence. Town and the first combat region now use painted maps; the remaining nine regions still use prototype scenery. Online play and production Android release signing remain unfinished. CI publishes signed test APKs through GitHub Releases.

## Assets

The game consumes `web/sprites/*.webp`, `web/rig/*.webp`, `web/vfx/*.webp`, plus Noto Sans Thai and its accompanying open-font license. Each `monsters-N.webp` contains the ten monsters of region N, indexed by `zone` and `slot` in `web/catalog.js`. Character filenames match hero IDs. The assets were generated for this project.

## Skill system

The Skills menu contains ten techniques per sect, unlocked progressively from level 1 to 180. Equip up to three; use the touch buttons or keys 1/2/3 (Q also casts slot 1). Mana regenerates at 5 per second, and each technique has its own cooldown.

At level 60, craft a named technique from wave/circle/bolt/dash/field, one of five elements, and up to one modifier. At level 120, use two distinct modifiers. Fire/poison deal damage over time, ice slows, wind pushes and lightning increases direct damage. Modifiers implement piercing, life drain, wider area, higher power, faster casting cooldown, and longer status duration. Fields pulse four times. Life drain is capped per cast; damage-over-time effects of the same element refresh instead of stacking.

Buy ingredients for G in town. Crafting validates level, ingredient counts and money before deducting any resource. Recipes, ingredients and equipped slots persist in old or new saves. Current version has ten recipe slots; editing existing recipes, training-dummy preview and chained advanced techniques are not implemented yet. Custom recipe effects currently use lightweight procedural effects; sect techniques use the painted atlases described below.

## Painted spell VFX (20 techniques)

Twenty sect techniques now use two generated transparent animation atlases in `web/vfx/`, ten spells per sheet. Each sheet is 8 columns × 5 rows, four consecutive frames per spell. IDs s1–s10 and d1–d10 map to the sheet in row-major groups of four. Actual image dimensions are 1586×992; sampling uses fractional cell dimensions. Normal quality cross-fades adjacent frames; low quality draws one frame, without runtime blur. Both sheets are loaded before play to avoid a first-cast loading pause. Real-device frame-rate testing remains outstanding.

These are original generated xianxia effects; four-frame sequences remain stylized and are not full high-frame-count 3D simulations. Custom recipe fragment art (50 pieces) is deferred; custom techniques retain procedural effects for now. Skill upgrades are available from version 0.1.4.

Generation: built-in Imagegen. Prompt specification: transparent 8×5 game animation atlases, no characters or scenery, four phases (gather, expand, strike, fade), ornate luminous isometric Chinese fantasy spells. Sword motifs: crescent, lightning thrust, frost sweep, fire sword, sword circle, jade cyclone, ice lotus, seven-sword fan, azure dragon, heavenly sword rain. Demon motifs: blood claw, infernal orb, frost shadow, poison skull, blood lotus, soul chains, demon wing, spectral serpent, eclipse sigil, nine-lotus storm. Original art with premium fantasy MMORPG visual ambition.

## Mobile UI 0.1.1

Original light fantasy panels with blue window headers, persistent close buttons, top-right shortcuts, left analog joystick and radial right-hand combat buttons. Inspired by mobile MMORPG control conventions; no Ragnarok artwork or branding is included. Safe-area margins and compact landscape layout support small screens. Settings, shops, crafting, bestiary and skill windows share the same visual theme. Existing save key and Android application ID are preserved.

Verified in Chromium: four heroes front/back, analog movement, action movement lock, endpoint clamping, world bounds, simultaneous joystick/attack pointers and independent release, modal pause/close, small-landscape control bounds, and skill crafting/equipping/casting/save persistence. Physical Android playtesting is still needed.

## Walking correction 0.1.2

The 0.1.1 generated walk sheets did not actually alternate leading legs; adding frames alone did not fix them. They are replaced by isolated torso, thigh and shin/boot artwork in `web/rig/`, source rectangles and joint pivots in `web/rig.js`, and deterministic continuous gait in `web/gait.js`. No static painted legs remain beneath the animated legs. The failed walk sheets are no longer packaged.

Validation: 13 unit tests including opposite leading feet, lifted passing legs, planted-foot cancellation, continuous cycle seam and fixed world-space bone lengths. Browser review rendered eight phases for all four heroes from front and back; touch, movement endpoints, action startup lock, modal pause and small-screen controls remain covered. Physical-device gait assessment remains for the test APK.

Art: built-in Imagegen, identity references from the original hero atlases. Prompt: six isolated cutout parts per hero, three columns × two rows; front torso with split robe and no legs, separate thigh, separate shin/boot; corresponding back views; original costume and identity, transparent background, no floor or text. A background-removal pass was also evaluated. Sprite cutting uses original alpha component bounds and runtime clipping; hip anchors remain fixed instead of following each frame’s foot centroid.

## Two painted playable maps — 0.1.3

Qingyun town replaces the geometric town with original painted Chinese sect architecture. Jade Bamboo Valley replaces region 0 with a painted forest, waterfall, stone altar and combat clearing. Assets: `web/maps/town.webp` and `web/maps/bamboo.webp`, 1536×1024 each, compressed WebP. They are original Imagegen artwork, not copies of Ragnarok assets. Prompts specified an orthographic elevated wuxia environment, detailed jade roofs/stonework or bamboo/waterfall, broad connected walkable areas, and no baked characters or interface.

`web/maps.js` aligns hand-authored walk polygons, service points, spawn points and monster placements to the final art. Eight-neighbor A* paths validate segment clearance and prevent diagonal corner cutting. Joystick movement, pursuit, dodge, skill dash and knockback share swept collision. Town labels route players to the shop, forge, skill hall or valley exit. Return travel and the map-selection previews connect the two scenes. Camera clamps to image bounds; zoom never reveals outside the map. First-region monsters use a smaller aggro radius to avoid pulling the entire clearing on arrival.

Backgrounds are baked paintings; buildings, ponds, roofs and dense boundary vegetation are outside the navigable area rather than fake traversable 3D geometry. The existing walking rig is unchanged in this map update and is still awaiting a satisfactory visual revision. No claim of matching a reference game's production quality has been verified.

Validation: safe spawn/POI reachability, swept collision against pond/roof boundaries, projection round trips, browser interaction with all three town services, travel both ways, ten valid monster spawns and pursuit, and small landscape layout. CI checks both painted assets are packaged in the APK.

## วิถีเชียน — 0.1.4

Renamed the visible game and Android label; application ID and save key stay compatible. Character progression now grants 10 attribute points and 10 skill points per level, including previously earned levels on old saves. Vitality changes HP and defense, strength changes attack, spirit changes mana and spell power, and agility changes bounded critical chance, attack speed and movement speed. Techniques train to rank 20, gaining 6% base skill power per rank. Reputation grants 1 per monster and 25 per boss with display titles. All progression persists locally.

The auto button switches nearby-target selection, pursuit and basic attacks on/off. Manual movement takes priority. When off, tapping a monster selects it; hold attack to pursue and attack. Turning auto off clears pursuit immediately. Auto does not cast skills or consume potions.

Walking uses a longer distance-driven stride, hip weight shift, upper-body counterbalance and separate skirt sections following the thighs. This removes the static long-robe overlay that concealed upper-leg movement. Monsters now patrol near their spawn, pause independently, breathe, sway with movement, anticipate and lunge when attacking; hit monsters react by becoming aggressive. These remain procedural animations from existing artwork, not newly painted full frame sequences.

Validation: 22 Node tests including legacy save migration, spending, rank limits, stat combat effects, actual runtime auto on/off and monster roaming; JavaScript syntax check. Browser visual verification was unavailable in this environment (Chromium download failed). Physical Android assessment of the revised gait and UI remains required.

