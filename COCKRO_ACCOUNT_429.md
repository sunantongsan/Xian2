# COCKRO 4.29.0 / Android 107

Account management is reachable from the character roster (including an empty roster) and Settings. It contains sign-out confirmation, set/change character-deletion password, password recovery through a fresh same-Google-account PKCE login, character deletion, whole game-account deletion, server-verified purchase history, privacy information and support.

The game password is not a Google password. Recovery requires the same linked Google identity and grants a five-minute, single-use reset. Existing Google login and game protocol remain compatible. Patch engine stays 88 for installed apps.

Account deletion requires the game password plus the exact confirmation phrase. It revokes game sessions, removes all character slots, archived characters, matching release-backup saves and account mappings, and removes identifying links from purchase deduplication receipts. A durable deletion journal prevents resurrection and resumes interrupted cleanup. Existing offline actors and fights are removed before another tick can persist them. A pending purchase blocks account management until verification finishes.

Supabase Auth cleanup is a separate server-side queued step using SUPABASE_SERVICE_ROLE_KEY, never a client credential. Both connected Supabase accounts denied access to this project during this change. No production identity was deleted in testing and the admin credential was not available to configure. Until configured, the UI explicitly says identity cleanup is pending; it must not claim full identity erasure. Configure this secret securely on the online server, then the worker retries at startup/every minute. It permanently deletes only the journal's verified linked Supabase UID; this does not delete the person's Google account. Pending UIDs cannot relink to a new game account. Completed records drop the UID.

The journal must be preserved across disaster recovery, and deleted-account tombstones must be applied before restoring historical backups. External VPS/provider backups outside the application's release-backups directory are not erased by this process and need the operator's retention/erasure procedure.

Purchase history is account-scoped, 20 entries per page. It shows verified product/gold, purchase or recording time, order ID when supplied by Play, character name when captured, and credited/processing status. Legacy receipts have no retroactively invented order ID, exact payment amount, or refund status. Actual amounts/refunds remain in Google Play order history. Failed or pending purchases not yet verified are not presented as successful. Purchase tokens are never exposed. Receipts are not double-credited.

Validation: 187 Node tests passed, including new password/deletion/identity-retry/history tests and a real WebSocket test ensuring an offline character cannot reappear after account deletion. Local Playwright exercised set/change/wrong password, purchase history, wrong delete confirmation, character deletion, empty-roster access and full game-account deletion with no page errors. Screenshots use local synthetic test data, never a real charge. Physical-device and live Google recovery have not been tested for this release.


## Release evidence (2026-11-01)

Source: 7bf40da90561e3ef694f260bb846fdf40592b16a. Online deployment run 41281011632 succeeded, including production health 4.29.0, registration/two-player smoke and SSV rejection. Production patch deployment dpl_6mPxQDrSaD68HjTmNhJpfLNPRLyG is READY. Preview package integrity and all 111 asset hashes were verified. Patch SHA-256: 0f17a1012678b64e63cd965801aa560309e282e36e2f3c59c5f74ce6933ca71e.

Android bundleRelease, lintDebug and native unit tests succeeded (21 passed, one optional live-feed test skipped). Signed AAB 107 is 27,284,972 bytes; SHA-256 9d8a6aa65a9aa70ff785f97de787b274c073cbbda43f6498e3f54a41ea23ecc2. JAR signature verified and bundled game.js/release.json match the tested source. Artifact saved as COCKRO-4.29.0-107-signed.aab (Library libfile_ce56a7bd9d108191b16c66a09fa0721b).

This turn did not upload 107 to Google Play or alter pending Store publication. Existing compatible apps receive the game patch through the existing update feed. Supabase administrative access remains unresolved; do not describe identity deletion as fully enabled.
