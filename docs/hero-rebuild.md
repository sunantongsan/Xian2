# Complete character replacement — 0.1.7

All four playable heroes have new full-body artwork. The old cutout rigs, old sprite atlases and runtime motion-capture retargeter are removed from the app. None of the old character pieces are reused.

Each hero has 16 walking images (8 front, 8 back), plus 8 distinct full-body action images: standing front/back, sword wind-up/strike/follow-through, casting, hurt and defeated. Left directions mirror the corresponding right direction. This is a 2D frame animation system, not a rigged 3D model. The artwork was created with built-in image generation; pose diagrams derived from CMU 07_01 were used as guides. These are painted interpretations of the poses, not an exact motion-capture playback.

`web/hero-animation.js` draws exactly one intact image per character. There is no separate head, torso, arm or leg rotation, anisotropic scale, skeleton retargeting or body-part compositing. Walking frame timing depends on actual distance moved. Stopping switches to a dedicated grounded standing pose. New artwork also replaces portraits and character selection.

`tools/pack-heroes.mjs` extracts complete cells and uniformly scales whole poses into 256-pixel cells, aligning the ground baseline. It never edits or warps anatomical parts. Inputs are the image-generation output files listed in the packing report. Optional development dependency: sharp. The game has no added runtime dependencies and works offline.

Verification includes source-frame bounds, complete front/back loops, mirrored facings, idle after movement, all four heroes and action states, plus existing progression and auto-attack tests. A preview is rendered from the actual frame selector and final atlases. Visual QA covers pose sheets and game-size rendered frames; no physical Android-device test has been performed. Eight-frame painted walking is an improvement over the broken cutout construction, but should not be represented as movie-quality motion or a validated 3D character pipeline.
