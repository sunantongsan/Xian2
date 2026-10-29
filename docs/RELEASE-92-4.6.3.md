# COCKRO 92 / content 4.6.3

Release source: `56b583178609638d7cadf69895fbc7d765721c92` on `cockro/automatic-patches`.

This release keeps Claude's merged 4.6.2 gameplay changes, adds the red Cockro welcome illustration and launcher icon, displays native patch download progress over the welcome artwork, and adds a manual update check to the native patch menu. Android package and local save storage remain unchanged.

## Distribution

Production content feed: https://cockro-game-updates.vercel.app/latest.json

- Version: 4.6.3; engine: 88; minimum app version code: 91.
- Archive: 12,490,090 bytes.
- SHA-256: `88349e051debc4a0be9b130b141a708a84068ed03eacd94ebe40be9a9385d20a`.
- Verified all 56 archive file hashes and downloaded/extracted the public archive using the native updater's live integration test.
- Vercel production deployment: `dpl_H18bqBKEDZgg6frZxu2YNYB1VS9B`.

Android version 92 (4.6.3) contains the same production game assets. The signed bundle is 14,250,108 bytes, SHA-256 `8d9649c5b458bd72d63629029b3cf50d7f5d4018f8a49e4e829225b09b0d6cd9`. Google Play published it in internal testing release 8; the track confirmed version 92 ready for internal testers. It uses the existing upload certificate.

Version 91 can download the new gameplay and web welcome screen automatically on startup. The launcher icon and native pre-game patch screen require installing Android version 92 from Play. Never uninstall or clear app data to update: local saves live on the device.

## Validation

- JavaScript tests: 54 passed; syntax and asset validation passed.
- Android unit/integration tests: 20 passed, including live production feed version 4.6.3, download integrity, extraction, cancellation, recovery and save-preserving fallback.
- `bundleRelease` and `lintRelease`: passed locally using Gradle 8.13, JDK 17 and Android SDK 36.
- Browser UI: welcome artwork, character selection, town loading, travel to the forest, reload and continue all worked. This is not a physical-device Android smoke test.
- Play reported no change in supported devices versus version 91. This build contains no advertising SDK/AD_ID permission; the existing declaration mismatch was exempted for this release, without changing the app-wide declaration.

## Why the previous patch did not reach players

Claude's 4.6.2 changes existed in GitHub while the production feed still served 4.6.0. Native CI waited for an unpublished production version and failed. The new workflow checks the currently deployed live feed during the build; verify the intended new content version after production publication.

GitHub Actions could not start this release because the account reported failed payments or a spending limit. The app was built locally instead; no spending or billing settings were changed.

## Instructions for the next coding agent

1. Start from the latest `cockro/automatic-patches` head; preserve other agents' work and saves.
2. For game-only changes, increment `web/release.json` and package version, run tests and build the patch feed. Do not change the engine unless compatibility requires it.
3. Test a preview, then explicitly deploy the tested source to the existing Vercel project's **production** environment. A GitHub push or a Vercel preview alone is NOT proof that players receive the patch. Automatic production-branch configuration was not changed in this release.
4. Fetch the public production `latest.json`, verify the expected version, download its ZIP, verify size/SHA-256 and archive file hashes. Run the native live updater test with `COCKRO_LIVE_UPDATE_TEST=1` and `COCKRO_EXPECT_VERSION=<new version>` after publication.
5. Icon, manifest, native Java or permissions changes require a higher Android version code and a signed Play internal-test release. Content ZIPs cannot replace a launcher icon.
6. Keep signing keys/passwords outside GitHub and never print or commit them. Do not change billing or enable paid services.

Players do not need to download or import ZIP files for the automatic production feed.
