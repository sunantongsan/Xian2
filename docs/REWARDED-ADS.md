# Rewarded ads integration — native 94 / 4.12.0

Implementation uses Google Mobile Ads 25.5.0, UMP 4.0.0, AndroidX origin-scoped main-frame WebMessageListener. Minimum Android API 26 unchanged. No JavaScript inventory grant and no timer-based simulated reward.

## Behavior
- Player explicitly chooses one of the five upgrade materials; one completed, verified ad grants one item.
- Real rewards require an online account and Android native 94. Offline saves and browser builds do not receive rewarded items.
- Server issues a random 192-bit ticket tied to account/item, persisted before loading the ad. One new ticket per 90 seconds, at most 100 per rolling 24h. These are abuse ceilings, not a shop economy promise.
- Native passes ticket and pseudonymous account ID through SSV options. Google signs the callback. Server checks raw-query ECDSA SHA256 DER signature, configured ad unit, reward amount 1 and type `item`, account, ticket, timestamp and transaction.
- Ticket/reward transaction and inventory are saved atomically in one account file. Duplicate callback returns success without a second grant. Reward can arrive after the player disconnects or the server restarts.
- Show/load failure and early dismissal never grant locally. SDK earned callback displays “waiting for verification”; inventory arrives in a server snapshot.
- Debug APK always uses Google's sample ad IDs and cannot grant real rewards. It installs separately as `com.sunantongsan.networkcokcro.adstest` / COCKRO Ads Test with its own save. The production application ID is unchanged.
- UMP refreshes consent on launch; no ad request until canRequestAds. Required privacy-options entry is available in the in-game privacy page. Only one ad loads at a time.

## Remaining activation requirements (not completed)
1. Owner supplies AdMob Android App ID (`ca-app-pub-…~…`) and Rewarded Ad Unit ID (`ca-app-pub-…/…`). Neither is a password. Configure UMP messages in that AdMob app.
2. Configure rewarded unit reward amount **1**, item **item**, SSV URL **https://game.guardscan.xyz/online/ads/ssv**. Validate callback in AdMob. The deployed reverse proxy must route `/online/ads/ssv` unchanged to port 8091; retain original query order/encoding.
3. Set `ADMOB_REWARDED_UNIT_ID` in backend service environment; rebuild/deploy server. Real grants stay disabled when absent or using Google's sample publisher.
4. Build release with env `ADMOB_APP_ID` and `ADMOB_REWARDED_UNIT_ID`. Gradle rejects missing/sample IDs for release. Use the existing production signing key and unchanged application ID `com.sunantongsan.networkcokcro`; versionCode 94 is only valid if higher than current Play version. Confirm Play package/signing identity before upload.
5. Publish updated privacy policy, review Play Data safety/Contains ads/target audience and AdMob app verification/app-ads.txt as applicable. Do not claim a general-audience or child-directed audience without owner confirmation.
6. Verify on physical Android: consent required/denied/accepted, privacy options, real test device, no fill, early close, completion, background/resume, disconnected callback/reconnect, duplicate/restart. Automated server tests do not substitute for device/AdMob end-to-end testing.
7. Whole-character fashion sets and 7-day fashion rental are a separate unfinished feature; this release grants upgrade materials only.

## Validation
`npm test`, `npm run check`, `npm run build:server`, `node tools/items-mobile-smoke.mjs`, `node tools/ads-browser-smoke.mjs`.
GitHub workflow `.github/workflows/ads-validation.yml` compiles/debug-tests/lints Android and retains a test APK. It does not publish to Play, use the production key, or activate monetization.

References: https://developers.google.com/admob/android/quick-start ; https://developers.google.com/admob/android/privacy ; https://developers.google.com/admob/android/rewarded ; https://developers.google.com/admob/android/ssv

## Verified in workspace (2026-10-29)
- Node suite: 98 passed, including cryptographic tampering rejection and HTTP callback offline/restart/replay tests using locally generated ECDSA test keys (not actual Google traffic).
- Mobile browser regression and mocked native bridge tests passed. Mock completion does not change inventory.
- Android debug Java compilation, unit tests and lint succeeded with Gradle 8.13 / JDK 17 / SDK 36; 20 native tests passed, 1 optional live-feed test skipped.
- Hosted GitHub validation run 40907153785 stopped before any job steps; local build used instead. No reason is claimed without runner logs.
- Production remains 4.11.0 until ad account configuration and on-device verification are complete. Source targets 4.12.0 / native 94. No Play upload or live monetization has occurred.
