# COCKRO 4.28.0 — visible, avoidable PvP attacks

PvP previously applied damage and could produce a defeat in the same command that started its animation. Attacks now commit a server-owned pending impact: 320 ms for basic attacks and 550 ms for skills. At impact the server checks living actors, map, range, line of sight, revive protection and dash invulnerability. Moving away or dashing can cause a miss; no result is predetermined at selection. Basic attack requests have an 800 ms minimum interval and cannot stack pending attacks. Damage is capped at 30% of the defender's maximum HP per hit while preserving lower damage from stats/defense.

The selected opponent has a persistent named HP panel and an explicit online/offline label. Offline characters still defend automatically using their own supplies; this is not represented as a live human opponent. Old unread reports produce a nonblocking notification, and pending fights are excluded from completed history. Player input remains available during combat.

Native versionCode 106 / versionName 4.28.0. Existing saves, characters and inventory schemas are retained. Both backend and client must be deployed; installing the Android client alone does not update server combat rules.

Validation: Node suite, timing/range/dash/spam/death/map-transition tests, real WebSocket offline defense and restart tests. A local browser at 844x390 connected to the actual local server, selected a test opponent through the UI, displayed both characters fighting and the opponent HP panel, and reported no runtime errors or interrupting history modal. Physical Android testing and live rollout remain release gates until recorded as completed.
