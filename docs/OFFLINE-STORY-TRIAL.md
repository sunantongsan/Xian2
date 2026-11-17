# COCKRO MAN offline story trial

Based on `release/evolution-wings-4502` (web content 4.50.2), with Android application ID `com.sunantongsan.networkcokcro`, versionCode 114. This identifies the Store application source, not proof that this branch is the current production patch.

## Implemented

- Existing login/roster screen offers **ทดลองเนื้อเรื่อง • ออฟไลน์**, opening `story-test.html` in the same web bundle. No new Android package or native code changes.
- Reuses existing hero animation, combat, inventory, skill, monster and Thung Kula terrain assets. One tile becomes a bounded 2400 × 2400 stage, with walkable geometry following its visible dirt trail.
- Six regular enemies and one boss, no respawning, route marking, end marker, introductory story and completion dialogue.
- 500 G on stage completion once per run. Replaying explicitly starts a new run; loading a completed run starts the next run.
- Local state is isolated under `cockro-story-test-v1`; no token, online character, legacy save or premium balance is imported. XP, inventory and slain-enemy IDs persist. Re-entering begins at the starting checkpoint with full health; slain enemies stay cleared. Loot is collected immediately where inventory permits; overflow remains on the ground with the existing timer.
- No gameplay server connection, premium store, reward ads or field banner in the test route. Native startup may still check for content updates; this is not a claim that the entire Android shell has been validated offline.
- Existing online route remains accessible through **กลับเกมหลัก**.

## Run

From a complete checkout of this branch:

```
python3 -m http.server 8080 --directory web
```

Open `http://localhost:8080/story-test.html`. On an existing compatible Android client the four changed/new web content files need to be included in a complete verified patch through its current update pipeline. Do not import these files alone as a native patch ZIP.

Changed web files: `game.js`, `story-stage.js`, `story-test.html`, `story-test.css`. Release metadata intentionally stays unchanged: no production feed, server, APK, AAB or Play release was published.

## Validation

- `node --check web/game.js` passed.
- `node --test tests/story-stage.test.js`: 4 passed. Tests cover duplicate kill/reward prevention, save parsing and actual core character validation, actual reward collection, real pathfinding through every segment, exit reachability, and rejecting movement outside the corridor.
- Browser launch was attempted with the installed Chromium but the host denied its process singleton socket. Thus rendered UI, touch interactions, full end-to-end play, audio and actual Android/WebView compatibility remain unverified.
- Test-only Thai story text; English localization and additional stages remain future work.

Before releasing: verify base versus deployed content, play through on a phone, test restart and airplane mode, verify returning to the online account preserves inventory, and generate the full verified update feed. The old packaging script hardcodes 4.5.0 and must not be used unchanged for publishing this candidate.
