# COCKRO 4.37.0

Based on 4.36.0 / Android 112 (9c3287a), retaining resumable startup downloads and roaming creatures.

- Cache collision polygon bounds; identical results at 30,000 town points. Synthetic movement checks: 10.72 ms → 4.79 ms (55% less CPU time on development host; not a phone FPS measurement).
- Cull offscreen actors/effects, remove monster blur, avoid repeated coin DOM reconstruction.
- Compact menu opens upward; permanent illustrated bag and shared-vault shortcuts.
- Bottom chat composer: blue map speech, gold world shout; 5.5-second head bubbles. Whispers remain private. Preserve drafts after send errors and suppress combat hotkeys while typing.
- FORGE-09 near the mechanical arms opens existing upgrades on tap.
- Server-enforced six-digit account vault PIN with salted scrypt hashing, account-wide failure limit, five-minute grants, disconnect lock, manual lock and change PIN. Existing funds and items remain intact. Public responses never include the hash. New client fails closed against an old server.

Validation: 235 Node tests passed; JS syntax; server bundle; patch packaging; Chromium at 844×390, 640×360 and 390×844, checking menu/skill overlap, chat send/ack/errors, inventory shortcut and PIN setup/deposit. Physical Android performance and real software-keyboard behavior remain unverified.

Deploy matching server first, verify vault and chat, then publish the client patch. Do not publish the client alone. No production server or patch alias changed during preparation. Android remains 112.
