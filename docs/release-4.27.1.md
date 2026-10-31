# COCKRO 4.27.1 — counter shop and gold-store preparation

## Live game changes
- MERC-01 stands at the painted supply counter, map UV [.174,.407], with the existing animated hologram and greeting.
- Clicking the merchant opens the shop immediately from anywhere in town. The server checks town membership, funds, item caps, bag capacity and level; walking to the counter is no longer required. Forest purchases remain rejected.
- Compact 40px product icons, fixed category rail, independent product scrolling; potions, class weapons, jewelry, materials/gems and currency exchange.
- Potions cost G. Equipment and upgrade materials cost premium gold. Potions/materials support atomic bulk purchases of 1–100 items, rejecting malformed quantity, insufficient funds and inventory overflow without partial charges.
- Exchange is 1 gold = 10,000 G with an in-page second-tap confirmation compatible with the installed Android WebView (no dependency on JavaScript confirm dialogs). Exchange is one-way and capped at 1,000 gold per transaction.
- Weapon shop price: 1,000 + 500 × tier² gold. Ring/amulet: 600 + 250 × tier² gold. Existing purchased items and balances are retained; equipment level requirements remain.
- A level-210 rare weapon, ring and amulet, each upgraded +9 with a diamond, including alloy, upgrade gold and enough converted G, costs 450,983 gold. The 500,000-gold pack leaves 49,017 gold. This is a strong complete upgrade build, not a claim that level progression or all combat opponents are bypassed.

## Real-money purchase implementation (not activated)
Catalog: cockro_gold_5000 = THB30 / 5,000 gold; cockro_gold_20000 = THB100 / 20,000; cockro_gold_150000 = THB500 / 150,000; cockro_gold_500000 = THB1,000 / 500,000.

Native Android versionCode 105 / versionName 4.27.1 adds Google Play Billing 8.3.0. The client queries real Play product prices immediately before checkout, supports cancellation/pending purchases and recovery of unconsumed purchases. Checkout binds the authenticated account and selected character through obfuscated account/profile IDs. No client callback grants currency.

The authenticated server verifies product/token using Google Play Developer API and an allowlisted product catalog, checks PURCHASED, quantity=1 and exact account/character ownership, then saves balance and a receipt marker together. A global hashed-token journal prevents cross-character reuse. Receipt replay and crash recovery are idempotent. Google consumption follows durable grant, with retries if consumption is temporarily unavailable. Raw tokens are not stored in the journal.

`GOOGLE_PLAY_CREDENTIALS` must point to a protected service-account JSON on the server with the required Play purchase verification/consumption permission. Without it, checkout remains disabled. No credentials were added or exposed in this release.

Still required before launch: create/activate the four consumable products with the requested Thai prices, configure the backend credential, sign the AAB with the existing upload key, upload to the appropriate test track, and perform a license-tester purchase/restart/cancellation recovery check. No actual payment was made or enabled this turn. Refund/chargeback reconciliation must be finalized before a public paid launch.

## Validation
- 176 JavaScript/server tests pass; syntax and server bundle checks pass.
- Android build succeeded locally: 22 unit tests, debug APK, release AAB, debug lint and release vital lint. GitHub-hosted build did not start because GitHub reported an account payment/spending-limit issue; the local build completed instead.
- Source commit abda4de8cd67276bb9a8108c683000b7dbbb1846. VPS deployment run 41168520396 succeeded; Vercel deployment dpl_8FPB4tFMpMxkVeg13MdoKUjFXtaQ ready.
- Live patch 4.27.1 independently downloaded: 21,218,691 bytes, SHA256 efb37bbb929fb584f1df9ae64e4e9b70e42859eef9c774a560d2b84275a342b1; all 111 manifest hashes verified.
- Live browser QA: from the central spawn, shop opens immediately. Purchase of 10 HP potions changed stock 11→21 and G 999,950→999,450; gold remained 49,750. Exchange of 1 gold changed gold to 49,749 and G to 1,009,450; balances survived reconnect.
- Built release AAB is deliberately UNSIGNED (no original upload key was available in this workspace or the targeted Library searches). Size 27,248,480 bytes; SHA256 73620b8bcfe2589364506ee5404bac2657b8db9692eac5dde189e5a05ac48a02. Saved as COCKRO-4.27.1-105-unsigned.aab. Do not present it as ready for Play upload.

- Final live visual QA: merchant visibly stands behind the counter; clicking its sprite from across the plaza immediately opened the categorized shop. The four promotional gold packs display the exact requested amounts/prices and remain disabled pending native/Play setup. Review screenshots are in `review/cockro-4.27.1-*.jpg`.

- Authenticated Play Console successfully. App 4973660205453037962 / com.sunantongsan.networkcokcro has no one-time products; Console explicitly requires uploading an APK with Billing permission before allowing product creation. Existing release does not meet this requirement. This confirms that signed native build upload is the immediate blocker, not account login.
- Live 4.27.1 in-page two-tap exchange also verified: 1,009,450 G / 49,749 gold → 1,019,450 G / 49,748 gold.
