# COCKRO 4.21.0 / Android 104

Google return handling now receives cold-start intents, persists the five-minute pending transaction privately, journals the callback in web storage, waits for JavaScript readiness and acknowledges delivery only after journaling. The web client persists the server flow across WebView recreation, suppresses duplicate completion, retains the device account on error, and displays completion/error inside the active dialog. Original Google PKCE provider, guest saves and account mapping are preserved.

Online dragonfly basic attacks now render rail arrows instead of sword slashes. Selection rings appear only on the targeted living monster. Four generated sci-fi weapon illustrations are used by inventory, shop and forge; 24 generated ability icons and bounded class-colored combat geometry replace fantasy sword effects. Existing progression IDs, damage rules and equipment stats are unchanged. Artwork generated with built-in imagegen: plasma sword, nanovenom twin daggers, railbow, sonic hammer; 6 skills per class. Browser-reviewed preview at https://cockro-game-updates.vercel.app/play/combat-preview.html .

Source implementation: 5bc5cd45b461407fa956aa649efe88314908a759.
Validation: 141 Node tests pass; Android unit suite 22 cases, 0 failures, 1 opt-in live-feed test skipped; release bundle builds and signature verifies. Signed bundle assets were byte-compared with final local source. Live production patch downloaded and all 93 entries verified by SHA-256.

AAB: COCKRO-4.21.0-104-signed.aab
SHA256: 98aa9098beb49beec7053fc91df573c1e55cbcfda1c881135458120f06e52a98
Patch SHA256: 9bb0e60d9a7d745b86d044fbea1fc94a868f09fb52e5b63e37443456c0fe955b
Production Vercel deployment: dpl_HSMLeEnMGSksw6atnuaKHN8qb3C5.

Internal Play release 16 published and visibly available to internal testers. Closed Alpha release 7 prepared from the same 104 bundle. Physical Android Google sign-in and process-kill end-to-end verification remain unperformed; do not claim that choosing a real account completed successfully. Update the existing installation; do not uninstall or clear data. Android 104 is required for cold-start callback recovery.
