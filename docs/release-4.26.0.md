# COCKRO 4.26.0

Reviewed attached 8350.mp4 at 8s and 16–17s. The footage shows oversized currency icons and labels, square atlas boundaries and overlapping plasma imagery. These are visual defects independent of any network-latency diagnosis.

Changes:
- Ground icon size now 16 world-scaled units (clamped 9–19 CSS px), formerly fixed 38 CSS px. Smaller neutral labels (7.5–10px), thin stroke, abbreviated currency label, rarity-colored equipment name. Retains names/counts, eight-second lifetime and server-owned collection.
- Plasma draws one cached feathered core per damage footprint. No two-frame cross-fade and no repeated full-size halo stamps. Cache uses four 256px canvases, prepared at image load. Geometric attack range and server damage remain unchanged. Thirty circle effects now use 30 texture draws vs 420; waves 30 vs 240. This draw-call reduction is not an Android FPS measurement.
- Camera projection reused within each frame. Coarse-pointer devices cap game canvas pixel density at 1; DOM controls/text remain native resolution. Removes recurring blur from buff particle aura.
- Monster snapshot application preserves object identity so auto-hunt targets/blocked-target state remain valid. Empty/unreachable auto-hunt searches respect the 0.6s scan interval, instead of running path search every frame.
- Merchant moved to original supply-shop POI [.27,.54]. Shared position controls server purchase range. Merchant has idle lean, animated hand hologram and periodic greeting. Buff robot has articulated waving arm and intermittent free-buff invitation when player is nearby and free test buff is enabled. Speech lasts <4s per 12s cycle, not a permanent map overlay.

Validation: 169 tests pass; syntax and bundled server build pass. New regression tests cover stable target identity/HP, empty-area search cooldown, one texture draw per effect, NPC motion and speech timing. VPS workflow 41165287003 succeeded including server health and production registration gate. Vercel deployment ready. Patch 4.26.0: 21,212,331 bytes; SHA-256 3031d8716fe2e402d1fd7f823505c32d5fba168488058290a40af3ebb456af01; all 108 manifest hashes verified.

Android hardware frame pacing remains to be checked on the user's device; the supplied recording cannot establish a new-device frame rate after this patch.

Live browser QA: QA4221 walked to the relocated merchant; clicking MERC-01 opened the provision shop with potions, class weapons, materials, and version 4.26.0. Merchant screenshot saved in review/cockro-4.26.0-merchant.jpg.