# COCKRO 4.50.2 continuation — 2026-11-19
User authorizes production patch once complete; do not use or modify GitHub Actions.
Workspace: /workspace/scratch/b95252ff6088/xian4502
Base of this continuation: 56c706a6c749cfb26e788c13213298a7ed3e42ec (test/cockro-4502-single-3d).
Changes: correct server health/welcome release to 7.1.0 with gameplayBase 4.50.2; name pre-release backup correctly; validate assembled 3D model SHA-256 and let game use compatibility rendering on asset failure instead of trapping startup.
Verification: npm test — 354 passed, zero failures; npm run check; npm run build:server; node --check server/online-server.cjs; full patch rebuilt and all 455 manifest hashes verified. Build warns about pre-existing duplicate translation key.
Build locally: npm ci --ignore-scripts; npm test; npm run check; npm run build:server; python3 tools/build_update_feed.py.
IMPORTANT: rebuild server/online-server.cjs from this source before installation; older committed bundle is not the current source.
Production NOT updated. Live health at https://game.guardscan.xyz/online/health still reports 4.50.0. No real-account migration or compensation performed.
VPS installation paths learned from prior workflow: /opt/cockro-online/online-server.cjs, /var/lib/cockro-online, systemd cockro-online.service; stage /srv/cockro-deploy/online-stage; helper /usr/local/sbin/cockro-deploy-online. Inspect helper and service before use. Stop service and take a complete data backup before migrating; code rollback alone cannot undo data migration.
CloudVPS sign-in required in browser. No SSH key available in current environment. Never use Actions as fallback.
Vercel project cockro-game-updates, prj_uFR4UTdkKDnWp2CAtSL1iUmJ3bDp, team_8dbI49p4Y8SgcCI089NqXzZf.
Existing isolated test: https://cockro-game-updates-fth3bxfz1-sunans-projects-4868df82.vercel.app/play/test.html . Browser enters town but reports WebGL unavailable and uses 2D fallback; actual 3D rendering on Android remains unverified.
Release version 7.1.0 is a distribution version; gameplay remains 4.50.2. web/release.json still channel test. Do not promote feed until server and 3D checks pass.
Web3 menu is a placeholder; create/import/deposit/withdraw are NOT implemented. Do not describe it as a working wallet.
