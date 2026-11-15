# Preserved desert map 4.49.2

The previous desert map is retained here for future reuse, as requested. It is outside `web/` so players do not download an unused map.

- `hero-star.json`: original Tiled map, unchanged blob `ec3dcff43834f21c08516ded95e4a543f3a55fb0`.
- Original source snapshot: `sunantongsan/Xian2` commit `6787e2b60ce2685fd8c44d49ca7894253099fbae`, branch `feature/all-insect-side-walk-4492`.
- Generator and rendering modules are copied alongside the map for reference. Their relative imports still target their original locations; restore from that commit when reusing them.
- Existing original map textures remain in `web/maps/star/`; no old art was deleted.

Reusing this map as a separate dungeon will require a distinct map ID and server routing. It is preserved but is not an additional live destination in this change.
