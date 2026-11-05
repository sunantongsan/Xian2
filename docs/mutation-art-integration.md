# Five supplied sprite sheets integrated

The owner supplied seven contact sheets and selected five additional looks.
Image background extraction used the built-in image tool. The game assets
are lossless WebP exports of the selected transparent results, with original
resolution retained. No procedural replacement artwork was substituted.

| Existing species ID | Lv. 1–19 | Lv. 20–59 | Lv. 60+ |
| --- | --- | --- | --- |
| sword-cockro | Existing layered red hero | Existing layered red hero | New gold shield guardian |
| demon-scorpion | New gold/teal fighter | Existing layered purple fighter | Existing layered purple fighter |
| sword-dragonfly | New green heroine | Existing layered blue gunner | Existing layered blue gunner |
| sword-cricket | Existing hammer hero | New purple scientist | New green/gold bio-engineer |

All five new sheets have 32 poses: front/rear/right/left walking, attack,
skill, a non-looping four-frame death, idle, guard, hurt and recovery.
Ground roots are measured from opaque boot pixels, independent of wings,
antennas and effects. Empty top gutters exclude neighbouring-row glow.
Whole-frame rendering preserves authored body proportions. No save IDs,
items, balances or combat formulas are changed by these art additions.
The level-60 Cockro label is now ผู้พิทักษ์เกราะเหล็ก to match the shield.

The original three layered sets retain equipped weapon swapping. New sheets
contain authored job props (shield/sonic emitter); these props are baked into
the artwork, not independently swappable equipment layers. Equipment stats
and upgrade aura remain authoritative and unchanged. Job-specific combat
skills are a separate unfinished part of the broader progression candidate.

The same authoritative level chooses local, remote/offline, inventory and
wardrobe art. The loader requests only the active set, deduplicates requests,
retries failure and invalidates the HUD portrait when loading finishes.
A level boundary triggers the existing buff celebration and the mutation name.
Existing art remains a fallback while replacement assets load.

Validation: the complete Node suite passes all 254 tests, including actual WebSocket character
creation, PvP, save preservation, level boundaries, appearance snapshots,
asset bounds, rendering and asynchronous loader retry. All five looks were
rendered through drawHero at gameplay scale and visually inspected on dark
background. Client syntax and generated server bundle build pass.
Previously missing original audio and identity-cleanup fixtures were fetched from the same pinned repository revision before the complete suite run. Chromium install
failed with a truncated download; browser/physical Android validation and
live deployment are not claimed. No production version or manifest changed.

Rebuild: tools/pack-mutation-sheets.py accepts five transparent PNGs in order:
dragonfly-green, scorpion-gold, cockro-guard, cricket-scientist, cricket-engineer.
Source hashes and exact rectangles are recorded in mutation-art-data.js.
Background-edit prompt: remove only white to true alpha, preserve all 32
poses in four columns/eight rows, identity, colours and original order, clean
edges without white halos, no text/grid/shadows, keep effects within cells.
The engineer and green dragonfly received a second extraction to correct
nonzero background haze; the rejected versions are not used by the game.
