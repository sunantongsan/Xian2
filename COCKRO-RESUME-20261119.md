# COCKRO deployment status — 19 November 2026

Production patch **7.1.1** is live. Gameplay base remains MMORPG 4.50.2.
No GitHub Actions were started or modified.

## Current release
- Source commit: 33baf72c361beaa55286002ca1bfb7561bfac07d.
- Vercel production: dpl_JCjSsaqkQcLznJMvadNPyD4UY1Sc, READY with production alias.
- Feed: https://cockro-game-updates.vercel.app/latest.json
- Full ZIP: baea749500f5ec77a53ec99fcae272b0a224cde5a9a3bc1aa98fcee97ef22b02 (60,719,755 bytes).
- Sparse manifest: b8452e5762ac37bca9b5c968b3854ac56f26f3cfbfe3e5690410db61b56503fa; 456 files.
- Live sparse ZIP hashes and contents verified for game.js, world-input.js, stage-rig.js, cockroach-3d.js, release.json. All live source hashes match local files except a harmless extra blank line in local index.html. Production entrypoint uses game.js, not test-game.js.
- Server https://game.guardscan.xyz/online/health: ok=true, release=7.1.1, roamingCharacters=0, fullSuitDrops=false.
- Installed server SHA256: 74eb3edac42303d54bb64140ccff4ad5c3e108535d47de99e293997e734d5fb9.
- VPS backup: /srv/cockro-deploy/cockro-711/production-backup-1795082604/data.tar plus online-server.cjs.
- Receipt: /srv/cockro-deploy/cockro-711/installed.json.
- Data copy audit: /srv/cockro-deploy/cockro-711/audit-1795082431. All 57 accounts retain G, COCKRO, levels, account reward receipts and current equipment (weapon/ring/amulet) attributes except retired sockets. Restart repeat verified. No account secrets downloaded.
- Scripts: /tmp/ck711-stage.py, /tmp/ck711-audit.py (copy only), /tmp/ck711-install.py (stopped-service tar backup, code + data rollback).

## Implemented user changes
- Inventory portrait explicitly faces forward with dedicated full-model framing.
- Fixed movement joystick hidden. Tap blank world to walk; drag anywhere on canvas to steer; pinch or wheel zoom 0.45–1.5. Menus and combat controls retain their own interaction. Tap enemy selects and chases/attacks without holding attack.
- Disabled synthetic server roamers even with old roamers=true config; removed decorative town crowd. Actual online/offline player presence remains.
- Retired all old full suits/fashion, upgrade materials and gem socket UI, purchases, ad grants, drops, vault/trade stock. Existing data copied before migration; G/COCKRO and current enhancement levels preserved. New rewarded protection tickets remain.
- Removed town buff effects and NPCs; old buff requests rejected.
- Town dimensions reduced 4000x2666 -> 2400x1600; persisted town positions scale once with townRevision=711. Field maps unchanged.
- Idle/walk sword over right shoulder. Three actual attack clips Slash/Sweep/Cleave, server combo sequencing and timeout reset for PvE/PvP; first cut overhead down toward anatomical left.
- 355 automated tests passed, including migration idempotence, gesture cancellation/pinch semantics, three server combo hits, model grip constraints, sword-tip direction and portrait camera bounds.
- Isolated cloud browser preview: https://cockro-game-updates-pbehvnxme-sunans-projects-4868df82.vercel.app/play/test.html . Inventory verified with no old tabs and full visible character. Browser lacks WebGL, so this UI screenshot used 2D fallback. 3D geometry/animation verified separately using actual GLB; Android visual/performance test still not performed.
- Source workspace: /workspace/scratch/b95252ff6088/xian4502.
- Rebuild server bundle from source; tracked older bundle is NOT authoritative.
- Web3 menu still placeholder; wallet/create/import/blockchain/deposit/withdrawal NOT implemented.

## Previous release details (historical)

Production patch 7.1.0 uses the MMORPG gameplay base 4.50.2 (not the version 26 prototype).
User explicitly authorized completing and publishing the patch without GitHub Actions. No Actions were started or modified.

## Live deployment
- Web source commit: 878a262f55f3ad63f9728d41642d53365d597002.
- Vercel production deployment: dpl_Akhihz6fTmr6KtuotPbSWaEnJvCF (READY; production alias assigned).
- Feed: https://cockro-game-updates.vercel.app/latest.json .
- Server: https://game.guardscan.xyz/online/health reports ok=true, release=7.1.0, gameplayBase=4.50.2, singleCharacter=true, protectionTickets=true.
- Server bundle SHA-256: e37510a68b892eb311840e8bb12d128e2a41dacaeffe3f46ba5210b8f09b568e.
- VPS service: cockro-online; binary /opt/cockro-online/online-server.cjs; data /var/lib/cockro-online.
- Full production backup with ownership preserved: /srv/cockro-deploy/cockro-710/production-backup-1795079091/data.tar and online-server.cjs.
- Installation receipt: /srv/cockro-deploy/cockro-710/installed.json.

## Migration and testing
- 354 automated tests passed; client/server syntax checks and local server bundle build passed.
- Copied production data tested on loopback port 18091: 62 original characters -> 57 account survivors, 5 retired characters.
- Total credited to surviving characters: 209,930 COCKRO = 204,930 transferred balances + 5,000 compensation.
- Highest levels, exact credits and no duplicate payment on restart verified on the copy.
- Production installation reported the same 57 accounts, 5 retired characters and 209,930 credit.
- Full patch checksums for all 455 files validated locally before deployment.
- No live data was changed until the copy audit passed and a stopped-service backup was completed.

## Scope and limits
- One cockroach per account; retain highest-level character and archive retired originals.
- COCKRO enhancement +1..+12 and optional rewarded protection tickets implemented.
- Model assembly integrity checked; unsupported WebGL/asset failure falls back to compatibility rendering.
- Cloud browser entered the isolated game but did not support WebGL. Actual 3D appearance/performance on Android is still unverified; do not claim mobile visual tests passed.
- Web3 menu is a placeholder. Wallet create/import, blockchain node, deposit and withdrawal are NOT implemented or enabled.
- Important: rebuild server/online-server.cjs from source before future deployment; the older tracked bundled file is not necessarily the deployed binary. Never deploy it blindly.

## Continuation
Workspace: /workspace/scratch/b95252ff6088/xian4502.
Build locally: npm ci --ignore-scripts; npm test; npm run check; npm run build:server; python3 tools/build_update_feed.py.
VPS copy-audit script: /tmp/ck710-audit.py; install script with tar backup + data/code rollback: /tmp/ck710-install.py.
The browser VNC keyboard was caps-locked and mishandled shifted punctuation. Do not resend commands based on an immediate stale screenshot; verify rendered terminal state first. Never send repeated Ctrl-D (it exits the login shell).
Do not use GitHub Actions. Source commits use [skip ci].
