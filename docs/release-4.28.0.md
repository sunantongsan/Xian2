# COCKRO 4.28.0 — visible, avoidable PvP attacks

PvP previously applied damage and could produce a defeat in the same command that started its animation. Attacks now commit a server-owned pending impact: 320 ms for basic attacks and 550 ms for skills. At impact the server checks living actors, map, range, line of sight, revive protection and dash invulnerability. Moving away or dashing can cause a miss; no result is predetermined at selection. Basic attack requests have an 800 ms minimum interval and cannot stack pending attacks. Damage is capped at 30% of the defender's maximum HP per hit while preserving lower damage from stats/defense.

The selected opponent has a persistent named HP panel and an explicit online/offline label. Offline characters still defend automatically using their own supplies; this is not represented as a live human opponent. Old unread reports produce a nonblocking notification, and pending fights are excluded from completed history. Player input remains available during combat.

Native versionCode 106 / versionName 4.28.0. Existing saves, characters and inventory schemas are retained. Both backend and client must be deployed; installing the Android client alone does not update server combat rules.

Validation: Node suite, timing/range/dash/spam/death/map-transition tests, real WebSocket offline defense and restart tests. A local browser at 844x390 connected to the actual local server, selected a test opponent through the UI, displayed both characters fighting and the opponent HP panel, and reported no runtime errors or interrupting history modal. Physical Android testing and live rollout remain release gates until recorded as completed.

## Release evidence
- 181 Node tests passed. Android build/lint succeeded; 21 native tests passed and the opt-in live-feed test was skipped.
- Local browser QA screenshot: review/pvp/battle.png (two test characters; no production user attacked).
- Backend workflow 41278794557 succeeded, including hosted tests and socket smoke. Live health reports 4.28.0.
- Production Vercel deployment dpl_EhZL33tMTkk8DBbsc9yNBjpCcYve is READY; live feed 4.28.0 and all 111 manifest hashes verified.
- Signed AAB 106 / 4.28.0: 27,282,304 bytes; SHA256 31d0782cb9ff8c2c57a9d3f21ef2beb3a3ca52ad5e522df3978c188f09ec0e3e. Google Play accepted the artifact. Track publication is recorded separately after confirmation.
- Physical Android play/performance testing remains unverified.

Google Play published internal release 18, versionCode 106 / 4.28.0, on 1 November 2026. Console confirms available to internal testers. Closed Alpha promotion is in progress.
