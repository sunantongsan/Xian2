# COCKRO 4.8.0 — 20 species and level 61–120 Hero Star

Released 2026-10-29. Client commit `e52a1bc149abca39a4c8464662be076b97a1f7ce` on `cockro/automatic-patches`. Backend workflow pins `7c0abe9b0d6c62b13702b957349d8daad90682f9`; later client commit only aligns online burst warning rendering.

Production: https://cockro-game-updates.vercel.app/play/
Creature guide: https://cockro-game-updates.vercel.app/play/creatures.html

Forest remains levels 1–60. Existing Hero Star map now covers 61–120 in 12 five-level zones. It contains 267 reachable camps / 533 initial creatures, including six bosses at levels 70,80,90,100,110,120. Twenty distinct vector-rendered species occupy consecutive three-level habitats. Shared definitions drive client, server, catalog and deterministic map generator. Monster IDs 2000–2065 preserve bestiary/save compatibility with existing IDs. Entry minimum is enforced on client and server. Artwork has walk/hover animation; no additional raster assets needed.

Online attacks now distinguish frontal cone, aimed projectile line, radial burst, dash and melee. Offline uses existing attack AI. Protocol is `cockro-online-2` so pre-expansion clients cannot interpret new sprite indices incorrectly; players should reopen/update the game. Existing online accounts and offline saves are retained.

Validation: 69 local tests passed. All 20 species and levels 61–120 are represented in server population; all camps and warp gates are reachable; level gates, boss records/rewards, finite drawing geometry and attack areas tested. GitHub ran 11 advanced-world/map checks on VPS before install, followed by successful real two-client online smoke (movement, authoritative saves, persistence, shared monster IDs/HP). Run: https://github.com/sunantongsan/Xian2/actions/runs/40851992327 . Production deployment `dpl_AZ4xiu1bsh9e2ghVQjMEGVfNY3WU` READY. Browser verified all 20 rendered species, production online login and 12 correctly labelled level gates. High-level entry/combat validated with isolated server tests, not by modifying a live player account. Physical Android patch installation remains unverified.

Operate using the existing COCKRO Online Release workflow. No additional VPS privilege or service was introduced. See ONLINE-4.7.0.md for service and persistence locations; its old release/protocol/pin are superseded here.
