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

## Verified configuration (2026-10-30, Asia/Bangkok)
- AdMob app ID: `ca-app-pub-4585492700643566~3340769116`.
- Rewarded unit: `ca-app-pub-4585492700643566/6530873388`.
- Reward settings saved in AdMob: amount **1**, item **item**, cap **5 impressions per 2 hours**.
- SSV URL **https://game.guardscan.xyz/online/ads/ssv** passed Google's console verification and was saved.
- Production backend 4.12.0 deployed successfully by workflow run 40957455863 from source `5488f3c50589db68f0f35fbe5d1633ed0d3d5308`. Health, two-player smoke and unsigned callback rejection passed.
- Root `admob-config.json` supplies release/native and bundled-backend defaults. Environment overrides remain supported; explicit empty values fail closed. Debug builds continue using Google sample IDs.
- Google sends the numeric ad-unit suffix in callbacks. The verifier accepts the exact configured full ID or numeric suffix, never a different publisher's full ID.
- The signed console probe's reserved all-zero user/ticket pair returns success without granting inventory. Signature and freshness checks still apply; real rewards require server-issued tickets and matching unit/reward/account.
- 99 Node tests passed, including forged/tampered callbacks, console probe isolation, duplicate rewards, persistence and restart.

## Remaining activation requirements
1. **Store approval:** Cockro Network Android still shows requires review / limited ads and is not linked to a store. AdMob's store search for `com.sunantongsan.networkcokcro` found no result. No store identity was invented.
2. **Consent/privacy configured:** The existing public policy URL https://cockro-network-privacy-policy.vercel.app/ now serves Thai/English disclosures for COCKRO game version 94+. It was deployed to production from privacy-repository commit 6a4d487c1ec3950b855af38845bb536dd3a878aa (Vercel deployment dpl_6RyMq8qjP5CtkUC5dzFmosLLibx5, READY), verified HTTP 200 and rendered in browser. This URL was saved for Cockro Network in AdMob. Its European consent message was published successfully on 2026-10-30; default language English, Consent / Do not consent / Manage options enabled. Google UI says propagation may take up to one hour. Nova Striker's existing message was not changed. On-device UMP behavior still needs verification.
3. Review Play Data safety, Contains ads, target audience and applicable app-ads.txt requirements against the actual app. Do not infer a child-directed or general-audience classification.
4. Verify on physical Android: consent required/denied/accepted, privacy options, registered test device, no fill, early close, completion, background/resume, disconnected callback/reconnect, duplicate/restart. Automated tests and Google's console probe do not prove a completed in-game rewarded ad.
5. Confirm current Play version and signing/package identity before upload. Source uses versionCode 94 / 4.12.0 and unchanged package `com.sunantongsan.networkcokcro`. No Play upload or public release has been performed.
6. Whole-character fashion sets and 7-day fashion rental remain separate unfinished features; this release grants upgrade materials only.

## Validation
`npm test`, `npm run check`, `npm run build:server`, `node tools/items-mobile-smoke.mjs`, `node tools/ads-browser-smoke.mjs`.
GitHub workflow `.github/workflows/ads-validation.yml` compiles/debug-tests/lints Android and retains a test APK. It does not publish to Play, use the production key, or activate monetization.

References: https://developers.google.com/admob/android/quick-start ; https://developers.google.com/admob/android/privacy ; https://developers.google.com/admob/android/rewarded ; https://developers.google.com/admob/android/ssv

## Verified in workspace (2026-10-29)
- Node suite: 98 passed, including cryptographic tampering rejection and HTTP callback offline/restart/replay tests using locally generated ECDSA test keys (not actual Google traffic).
- Mobile browser regression and mocked native bridge tests passed. Mock completion does not change inventory.
- Android debug Java compilation, unit tests and lint succeeded with Gradle 8.13 / JDK 17 / SDK 36; 20 native tests passed, 1 optional live-feed test skipped.
- Hosted GitHub validation run 40907153785 stopped before any job steps; local build used instead. No reason is claimed without runner logs.
- Historical result: production was still 4.11.0 at this earlier check. The newer verified configuration above supersedes that status.

## Release artifact validation (2026-10-30)
- Local Gradle 8.13 / JDK 17 / SDK 36 run succeeded: testDebugUnitTest, bundleRelease, assembleRelease and lintRelease.
- Native tests: 20 passed, 1 optional live-feed test skipped. Release lint: 0 errors, 5 warnings.
- AAB signed with the original upload certificate, SHA256 fingerprint `44:3C:10:6C:A7:C2:48:98:F4:15:F2:B9:1F:C7:1C:66:65:13:F8:EA:68:60:98:07:7A:4F:94:DE:A2:3C:D9:DC`. JAR signature verification passed.
- Package, version name and real AdMob app/unit IDs verified inside the bundle.
- Artifact: `COCKRO-94-AdMob-signed.aab`, SHA256 `ce195a32ea22a91ed4eb21a807829bb2e073ddcf365bbee88d907c7023300b6d`. This is a Play upload bundle, not a directly installable APK.
- No physical-device ad completion, Play upload or full ad-serving approval is claimed.

## Internal game release 95 (2026-10-30)
- Source commit 64d912fd66319bd5cd02798cba0a1264f7ddc859, versionCode 95 / 4.12.1, unchanged production package and original upload signing certificate.
- In-game privacy page links to the published Thai/English policy. Android opens only that exact policy URL externally after a main-frame user gesture; other external WebView navigation remains blocked.
- Node: 99 passed. Android build/test/lint succeeded; 20 native tests passed and 1 optional live-feed test skipped. Signed AAB signature and packaged release/policy/AdMob ID verified.
- Uploaded and published to existing Google Play INTERNAL testing track 4701506968907566093, release 9. Console explicitly reports ready for internal testers, 30 Oct 2026 06:21 (Asia/Bangkok). Existing closed testing unchanged. Package/signing/version accepted by Play.
- Tester link: https://play.google.com/apps/internaltest/4701506968907566093 — owner account verified enrolled.
- Backend health remained healthy on server release 4.12.0; this client-only update did not redeploy backend.
- Physical-device ad load/consent/reward completion is still unverified. AdMob store link/app approval and public store metadata remain outstanding. Do not claim production monetization is fully approved.

## Internal recovery release 96 (2026-10-30)
- User still saw the disabled placeholder from 4.11.0 after Play displayed 4.12.1. Exact on-device cause is unconfirmed; do not claim the user failed to update.
- Reproduced a patch-selection defect: unreadable/missing patch.json fell through to using that patch. Regression failed before the fix and passes after. Invalid, older and equal-version patches now use bundled assets.
- Native resource cache is cleared on load; localStorage, cookies, online credentials and saves are not cleared. Local responses use no-store and WebView LOAD_NO_CACHE. Shop shows game 4.12.2 and native build code.
- Source 70a35cba02a0767a594dc0290befdde2cdd9782b; signed AAB version96/4.12.2. 99 Node tests and 21 native tests passed (one optional live-feed skipped); release lint and bundle build passed, JAR signature verified.
- Published INTERNAL release10 on track4701506968907566093, console reports ready for internal testers at07:02 Asia/Bangkok. No devices removed. Physical-device confirmation and ad completion still pending; no new ad approval claimed.

## Online welcome release 97 (2026-10-30)
- Source a91c90df560d369b34f6e6a49aa4d767d8902a53, native 97 / game 4.13.0.
- Welcome previews the authenticated account's current online character; select and Play connects directly online. New accounts choose their first hero on that screen. No offline/online menu choice. Current account storage supports one character, not multiple slots or cross-device login.
- Old offline saves remain untouched and separate; no migration to online inventory is claimed. Preview neither joins the world nor writes progress.
- Server default capacity increased to 64, configurable within 1..256; nearby character rendering limited to 32. This is not unlimited capacity or a production load-performance guarantee.
- 102 Node tests passed, including 64 real local WebSocket clients, rejection of the 65th, roster authentication/no mutation and online-only welcome. 21 native tests passed, one optional live-feed test skipped; local release build and lint passed. Hosted Android workflows did not run successfully.
- Backend deployed successfully via run 40978862416; actual production health reports release 4.13.0 and capacity 64.
- Signed bundle validated for packaged 4.13.0, native 97 and original upload key; Play accepted package/version/signature. Stale Gradle output was detected before upload; the current signed artifact was produced from the verified new intermediary bundle.
- Published INTERNAL release 11, named 97 (4.13.0) Online character selection, track 4701506968907566093. Play reports ready for internal testers at 07:23 Asia/Bangkok. Closed/public tracks unchanged.
- Removing offline entry addresses the user's confirmed offline path. Physical-device rewarded ad completion remains unverified and AdMob approval/serving limitations above still apply.

## Rewarded ad diagnostics release 98 (2026-10-30)
- User reports enabled ad button but no video. Exact physical-device SDK failure is still unknown.
- Source c450817a62d184283e5ac5bcddd1631f18632be1, native 98 / game 4.13.1.
- Persistent status inside the shop modal exposes ticket request, native load, verification and failures. Previous generic toasts were outside the modal top layer.
- Online transport now reports send failure; ticket wait expires after 15 seconds. Native loading expires after 45 seconds and ignores stale callbacks. Actual SDK error domain/code/message is shown locally, without account tokens.
- 103 Node tests passed, including transport disconnect/backpressure/exception regression. 21 native tests passed, one optional live-feed test skipped; local release bundle and lint passed. Original-key signature verified and Play accepted version/package.
- INTERNAL release 12 published as 98 (4.13.1) Rewarded ads diagnostics; console reports ready for internal testers, updated 30 Oct 08:30. Server remains 4.13.0; no backend change.
- Signed artifact COCKRO-98-Ads-diagnostics-signed.aab, 32959872 bytes. This release improves failure handling/visibility; it does not establish real ad fill, completed viewing or reward receipt. These require physical-device confirmation.

## Internal demo ads and responsive shop release 99 (2026-10-30)
- User physical-device screenshot of 98 confirms SDK error code 3 with Account not approved yet. Requests reached Google; account approval blocks real serving.
- Source a14f60a0c2520508ce7288ff4f3ce3fbea22d3a4, native 99 / game 4.14.0.
- INTERNAL ONLY bundle built with -PcockroTestAds=true. Uses Google's sample app ID and rewarded unit; BuildConfig.TEST_ADS=true verified. Sample mode initializes directly without production consent messaging, does not request an SSV ticket and reports test-earned without real inventory grants. Normal release default remains real IDs/consent/SSV; do not promote this test artifact to public production.
- Shop now updates existing balance, stock and button nodes on snapshots instead of recreating the modal every second. Scroll position stays intact. Immediate pending feedback, duplicate-click guard and bounded confirmation wait; no automatic purchase replay.
- Server sends a snapshot then opResult immediately after an operation; purchases and rewards persist immediately. Other dirty gameplay progress persists at 5-second intervals and on disconnect. Abrupt process failure can lose up to that interval of non-transaction progress. Client never uploads authoritative balances or inventories.
- 105 Node tests passed, including real-socket batched persistence/immediate purchase durability and shop DOM/scroll preservation. Local Android unit tests, release bundle and lint passed (21 native tests; one optional live-feed skipped).
- Backend deployment run 40988039538 succeeded; live health reports 4.14.0 / capacity 64. Main workflow commit 60c335d48d325c2b54143cb811fe76447338711e. Hosted Android validation still fails before useful validation; local build is the evidence.
- Original-key signed COCKRO-99-TestAds-signed.aab, 32962035 bytes, packaged version and sample manifest ID verified; Play accepted native 99 (4.14.0).
- Published INTERNAL release 13: 99 (4.14.0) INTERNAL demo ads and shop. Console reports ready for testers, updated 30 Oct 08:52. Public/closed tracks unchanged.
- Physical-phone demo playback/completion and subjective latency remain to be confirmed. Demo completion does not test real SSV reward delivery or account approval.


## Internal release 100 / 4.15.0 (30 October 2026)

- User confirmed v99 demo video playback three times, but received no items. That release deliberately suppressed demo grants; v100 completes the internal-test item loop.
- Explicit `internalTestRewards: true` in this INTERNAL deployment, override with `COCKRO_TEST_REWARDS=false`. Google demo callbacks are NOT cryptographic SSV proof. Internal grant tickets are account-bound, one-use, persisted before acknowledgement, expire in one hour and are capped at 20 issued tickets per rolling 24h. Disable internal rewards and build without `-PcockroTestAds=true` before any public production promotion. Real SSV path rejects demo tickets.
- Server sends inventory snapshot followed by reward acknowledgement. After video dismissal and server acknowledgement, game displays Thai congratulations, item art, quantity and a Claim button that opens the material inventory with that item selected. A short four-note fanfare respects the game sound setting. Duplicate completion does not grant or celebrate twice; closing early shows no success.
- Online inventory now uses icon slots for owned gear, materials, potions and fashion, with quantities; equipped slots and character portrait alongside. Details/actions appear when selecting an item. Inventory redraw is driven by actual contents/equipment changes, preserving scroll.
- Validation: 111 Node tests passed, including real socket demo grant persistence/reconnect/duplicate handling/disabled-by-default, inventory ownership, reward dismissal ordering, early close and claim UI. Android unit tests, release AAB and lint passed (21 tests, one optional live-feed skipped). Original signing key verified; Play accepted version 100 (4.15.0). Build output verified to contain release 4.15.0, celebration code, inventory module and demo AdMob app ID. Use outputs/bundle/release/app-release.aab for this build; the intermediary AAB was stale and was NOT uploaded.
- Source commit 227c726564e12f4d39b56eb0be9db9bc1d898a04. Backend run 40991902521 succeeded (two-player live smoke and unsigned SSV rejection included); health reports 4.15.0/capacity64. Main deployment commit 1e4798bd2a9f6c573ba2cf96e3e985a07bbc142d.
- Physical phone verification of v100 item receipt, visual layout and audible fanfare remains pending. Local file visual preview was blocked by browser URL policy; no workaround attempted. Real production AdMob approval and real signed reward delivery remain unverified. No retroactive compensation for the prior three demo views was applied.
