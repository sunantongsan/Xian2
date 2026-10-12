# วิถีเชียน 0.1.5 — whole-body character redraw

The four playable heroes now use newly painted cutout artwork in `web/puppets/`, packed as transparent WebP. The active renderer is `web/puppet.js`, with source rectangles and pivots in `web/puppet-atlas.js`. This replaces the old static upper-body rig for idle, walking, attack, skill, hurt and defeat. Character selection and the portrait use the same artwork. Save IDs and Android application ID are unchanged.

Motion: distance-driven 88-unit full gait cycle, alternating planted feet and lifted swing, two-bone legs and arms, opposite arm/leg swing, shoulder/pelvis counter-rotation, head stabilization and delayed sash movement. Idle blends to a taller grounded resting pose. All animation uses continuous joint coordinates; no duplicate-pose frame loop or frame cross-fade. Front and rear views are mirrored for four screen-facing quadrants. This remains a 2D articulated illustration, not a full 3D model or eight-direction motion capture.

Generation used built-in Imagegen. Two experimental whole-body pose atlases were rejected because their opposite-stride poses were too similar. They are not used or packaged in the game.

Final prompt specification shared by the four selected atlases:

> Production 2D skeletal animation CUTOUT PARTS atlas for original premium wuxia RPG วิถีเชียน. Beautiful semi-realistic painted normal adult proportions. Exactly sixteen separate detached pieces in a four-column by four-row grid, transparent gutters, no overlap, no text, no complete figures. Actual transparent alpha. Top two rows front three-quarter facing screen right: head with hair and neck; armless chest neck to waist; pelvis with short split tunic; upper arm. Next row: forearm and empty hand; thigh; shin with boot; detached flowing sash. Bottom two rows repeat the same eight pieces from the rear three-quarter view. Nearly vertical neutral limbs with hidden joint overlap. Every part fully inside its cell. No floor, shadows, glow, or weapons in the hands.

Subject specifications:

- Sword male: adult man, white/azure fitted silk tunic, navy trousers, silver bracers and shoulder detail, blue-trimmed boots, long black ponytail tied blue.
- Sword female: adult woman, ivory/pale azure fitted tunic, silver details, navy trousers, blue boots, jade hair ornament, high black ponytail.
- Demon male: adult man, crimson/black fitted tunic, gunmetal bracers, dark trousers and boots, long black ponytail tied red, restrained crimson embroidery.
- Demon female: adult woman, crimson/charcoal fitted tunic with gold edging, black trousers, dark crimson boots and bracers, black ponytail tied red.

Validation: front/rear eight-phase contact sheets inspected using the actual shared drawing function through a Canvas-to-SVG adapter. The accompanying MP4 previews the same poses for all four heroes. Node tests verify opposite arm/leg phases, torso motion, continuous cycle closure, limb lengths, idle grounding and all hero/facing/action draw paths. Gameplay tests cover saves, stats and auto-combat. Browser/physical Android visual and performance verification remains outstanding.
