# Automatic game patches (native app 91)

Source: sunantongsan/Xian2, branch cockro/automatic-patches.
Public feed: https://cockro-game-updates.vercel.app/latest.json
Vercel project: cockro-game-updates, prj_uFR4UTdkKDnWp2CAtSL1iUmJ3bDp.

Native startup checks a small HTTPS manifest. Higher compatible content versions download to a resumable app-private partial file, with strict size limits, no redirects, connect/read inactivity timeouts and SHA-256 verification. The existing archive validator verifies each entry and prevents path traversal. Activation changes a persistent pointer only after complete validation. The previous bundle remains until the new game reports ready. Failed or interrupted first boots roll back and block that content version until a newer release is published. Local WebView origin and localStorage are unchanged. Offline/cancelled checks open the existing game. Backgrounding suspends the boot deadline.

Only the native updater accesses the network. WebView external navigation remains blocked; no GitHub or Vercel credential ships in the app. Hosting exposes only generated patch files, not the private repository.

Publishing: increment web/release.json semver, run tests, then deploy the reviewed commit to the Vercel project with tools/build_update_feed.py as the build. Immutable ZIP path is derived from its SHA-256; latest.json uses no-store. Never overwrite content under an already released semver. A newer required native engine must be delivered as an app update; do not silently bypass minAppVersionCode.

The installed engine 88/89 cannot gain INTERNET permission or Java downloader code through a ZIP. One native update is mandatory. The original preview debug-signing key is unavailable, so installing an APK over that existing preview is not established. Do not advise uninstalling and losing local saves. Native build output is an unsigned production AAB for later original upload-key signing, not an installable update. No Play upload or real-device installation is claimed.


Slow-network behavior: startup must not switch to bundled assets after a fixed elapsed time while a patch is downloading. A steadily receiving transfer has no total-duration cutoff; the downloader retains a 5-second connect timeout and 8-second read inactivity timeout. Explicit Skip/Back remains available, and real download/validation errors open the existing installed game. These updater changes are native Java and require a signed compatible app update; a web ZIP alone cannot change an already installed updater.

Regression coverage: `node --test tests/android-update-startup.test.js` requires Java 17+ with the `jdk.compiler` module. It compiles the production startup method against deterministic boundary fakes, and exercises the production downloader with synthetic network responses/clock. This is not an Android lifecycle, emulator, or physical-device test.

Resumable downloads: `<filesDir>/patch-downloads/cockro-update-<sha256>.part` retains received bytes across a disconnected download, cancellation, or app restart. Reopening the app checks the feed again and resumes only the same content hash with `Range: bytes=<saved-length>-`. The 206 response must match the expected start/end/total and remaining length. A server that ignores Range and returns 200 replaces the prefix from byte zero; 416 retries once from zero. Changed feed content starts a different hash-addressed file and removes obsolete partials. Invalid ranges, oversize bodies, and a failing final SHA-256 discard suspect bytes. A short/failed network read retains the prefix; no partial file is passed to installation.

Only after exact total length and whole-file SHA-256 match does the existing ZIP entry/manifest validation run. `GamePatch.installStream` stages the complete extracted archive and commits the active pointer only after validation; previous active content remains available for failures/rollback. A complete but interrupted pre-install download is rehashed and reused. Resume is on the next app launch (the current attempt falls back to installed content with an explanatory message), not a background auto-retry service. There is no save/token clearing, automatic uninstall, server deployment, or signing change.
