# COCKRO MAN room campaign — 4.54.0

The main entry now opens `room-mode.html`. The earlier story trial remains at
`story-test.html`; its save and the online account are not migrated or deleted.

The new offline campaign has 30 stages, five rooms each, with a guardian in room
five. Portrait arenas crop the existing Thung Kula fields map. The town backdrop
and forest monster atlases are existing COCKRO artwork. Hero sprites are rendered
from the owner's COCKRO Armor 02 Combat Blender file: 8 directions, 12 walk frames,
8 attack frames, 8 death frames and a held idle pose. They are actual skeletal
animation renders, not transformed cutouts. The new sprites total about 531 KB.

Drag anywhere in the arena to move; releasing stops movement and fires toward the
nearest visible enemy. Movement interrupts unreleased shots. Projectiles collide
with cover and targets; enemy shooters telegraph their direction before firing.
Bosses fire five-shot fans. Each cleared room opens the upper gate; entering it
grants gold once and offers three powers. One power lasts for the current run.
Completing room five unlocks the next stage. Gold buys permanent attack/HP upgrades.

The isolated `cockro-room-campaign-v1` save checkpoints at room boundaries and
persists a pending power selection. Returning from the town replays the current
room from its entry checkpoint. Death ends the run but retains gold already
earned from previous rooms. No ads, purchases, server or GitHub Actions are needed.
Thai/English defaults to browser language and can be changed in settings.

Validation: room-run tests cover movement interruption, projectile damage,
cover collision, all 150 layouts, one-time rewards, pending-choice reload,
power effects, paused simulation and upgrade costs. Existing tests must also pass.
Browser visual and touch review is required before promoting the patch.

This is the initial playable room-mode adaptation, not a claim of 90% parity with
Archero. It has no cloned text, story, UI artwork, gacha, daily events or live ops.
