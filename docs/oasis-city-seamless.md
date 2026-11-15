# Compact oasis city and continuous desert hunting

Based on COCKRO 4.49.2 commit `6787e2b60ce2685fd8c44d49ca7894253099fbae` (Xian2 main is an unrelated prototype).

City 2 occupies a compact 25 × 23 tile rectangle within the existing 384 × 384 hunting map. Two five-tile-wide openings connect to the Thung Kula road and the desert hunting grounds. Crossing the hunting opening never changes map ID, sends an enter request, or shows a loading screen. The Thung Kula road keeps the existing cross-map road transition.

The Return Town button on the desert map now selects City 2; desert revival also returns there. Eight buildings use one 356 KiB transparent WebP atlas. Shops work inside either city and remain unavailable in hunting areas. Twelve level bands cover 61–120 with 432 camps, 855 spawn slots, and six bosses. Internal ravines have become traversable desert; the external boundary remains blocked. Map revision migration moves old desert positions safely to City 2 once.

The old map is preserved under `archive/desert-4.49.2/` outside the downloadable web assets, together with original generator/rendering references and its exact source commit.

## Performance and verification

- Distant desert monster movement sleeps beyond 1,800 world units, while damage-over-time and respawn processing remain intact.
- Ground chunks use 8 × 8 tiles, a bounded visible cache, and at most two chunk builds per frame with a five-millisecond scheduling deadline. A single chunk build can exceed that deadline; it is not a hard frame-time guarantee.
- Chunk creation happens before cached blits to prevent unbuilt areas from starving. Synchronous whole-view warm-up was removed.
- 21 focused Node tests pass: city openings, reachable camps/services, safe positions, home/revival, purchases, road travel and distant AI.
- Chromium renderer preview at 1280 × 800: 35 cached chunks; warmed rendering measured roughly 13–19 ms/frame in this environment. Initial build spikes reached 61–105 ms. This is renderer-only desktop evidence, not a full-game or physical Android benchmark.
- `web/review-oasis.html` is a reproducible renderer preview. Service markers in that preview stand in for existing NPC sprites used by the game.

## Release status

Source candidate only. No production server or signed client update has been deployed by this change. The server must be bundled with the same generated map and shared modules and deployed together with the client patch. Do not publish only the client map. No GitHub Actions build/deploy is requested by this commit.

Validation command:

```
node --test tests/desert-world.test.js tests/hero-star.test.js tests/account-roads.test.js tests/merchant-session.test.js tests/oasis-town.test.js
```
