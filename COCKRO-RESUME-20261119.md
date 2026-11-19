# COCKRO deployment status — 19 November 2026

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
