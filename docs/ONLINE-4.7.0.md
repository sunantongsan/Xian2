# COCKRO online 4.7.0

Released 2026-10-29. Client source: `cockro/automatic-patches` commit `6146f5df738272e5d7113527132b914a12e5e29d`. The `main` branch holds operations workflows; it is not the current game client source.

Play: https://cockro-game-updates.vercel.app/play/
Patch feed: https://cockro-game-updates.vercel.app/latest.json
Game server: wss://game.guardscan.xyz/online/world
Health: https://game.guardscan.xyz/online/health

## Verified
- 64 Node tests passed, including server-authoritative progression, combat/reward/respawn, cooldowns, duplicate identity rejection, real local sockets and persistence.
- GitHub Actions deployment and live two-client smoke test succeeded: https://github.com/sunantongsan/Xian2/actions/runs/40847003534 . Checks cover same village, remote movement, forged-save rejection, persistence/reconnect and shared monster identity/HP.
- Two browser clients visibly joined the same village with online 2/12 indicator.
- Production Vercel deployment `dpl_2V1b5AwbN3DYphzbCB5LBGEoRb1n` is READY.
- npm audit: zero reported vulnerabilities at release.

## Operations
Run the `COCKRO Online Release` workflow on main. `stage` only prepares reviewed files; `deploy` applies the fixed service bundle and runs smoke checks; `test` runs health and smoke without replacing the service. The workflow deliberately pins backend commit `feab8e792dc1f4bdf7ada40746aa24dd1241b968`. Update that pin only after reviewing and rebuilding a backend change. The subsequent client commits do not change the backend bundle.

The existing self-hosted runner uses `cockro-vps-control`. A narrowly scoped sudo helper accepts only the SHA256 of `/srv/cockro-deploy/online-stage/online-server.cjs`, installs it under `/opt/cockro-online`, and restarts `cockro-online.service`. No arbitrary root commands are exposed through this workflow. Previous server bundle is retained as `previous.cjs` for operator recovery. Service starts at boot. Caddy proxies `/online/*` to localhost:8091; previous routes remain.

Persistent account files are under `/var/lib/cockro-online` and must be included in the owner's regular server backups. Tokens are random device credentials and are not printed in workflow logs. Do not publish that directory or tokens.

## Initial-release limits
Single shared room capped at 12 players; this is an online test release, not a load-tested large MMO. Guest identity is tied to browser/app storage. Clearing app data or uninstalling loses the local login token; cross-device accounts/recovery are not implemented. Online progress starts separately; offline saves remain separate. Trading, party/chat/PvP and full workshop parity are not implemented. Some online skill effects are simplified. Physical Android device/WebView networking and patch installation still need device verification; browser and server checks do not establish that. Existing patch engine requirements are retained.
