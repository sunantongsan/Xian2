# Automatic game patches (native app 91)

Source: sunantongsan/Xian2, branch cockro/automatic-patches.
Public feed: https://cockro-game-updates.vercel.app/latest.json
Vercel project: cockro-game-updates, prj_uFR4UTdkKDnWp2CAtSL1iUmJ3bDp.

Native startup checks a small HTTPS manifest. Higher compatible content versions download to a temporary file, with strict size limits, no redirects, a total deadline and SHA-256 verification. The existing archive validator verifies each entry and prevents path traversal. Activation changes a persistent pointer only after complete validation. The previous bundle remains until the new game reports ready. Failed or interrupted first boots roll back and block that content version until a newer release is published. Local WebView origin and localStorage are unchanged. Offline/cancelled checks open the existing game. Backgrounding suspends the boot deadline.

Only the native updater accesses the network. WebView external navigation remains blocked; no GitHub or Vercel credential ships in the app. Hosting exposes only generated patch files, not the private repository.

Publishing: increment web/release.json semver, run tests, then deploy the reviewed commit to the Vercel project with tools/build_update_feed.py as the build. Immutable ZIP path is derived from its SHA-256; latest.json uses no-store. Never overwrite content under an already released semver. A newer required native engine must be delivered as an app update; do not silently bypass minAppVersionCode.

The installed engine 88/89 cannot gain INTERNET permission or Java downloader code through a ZIP. One native update is mandatory. The original preview debug-signing key is unavailable, so installing an APK over that existing preview is not established. Do not advise uninstalling and losing local saves. Native build output is an unsigned production AAB for later original upload-key signing, not an installable update. No Play upload or real-device installation is claimed.
