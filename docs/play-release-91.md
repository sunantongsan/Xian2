# Play internal release 91 — 29 October 2026

Version 91 (4.6.0), Aurora & Automatic Patches, was signed with the original Cockro Play upload key and published to internal testing. Console confirmed available to internal testers at 07:21 Asia/Bangkok. Previous active internal version was 84; draft 85 was replaced. Closed alpha remains unchanged.

The original upload key is recoverable from the owner's existing file named COCKRO-upload-key-backup.zip. It contains cockro-upload.p12, password.txt, README.txt, and cockro-upload-certificate.pem. Alias: upload. Public certificate SHA-256: 44:3C:10:6C:A7:C2:48:98:F4:15:F2:B9:1F:C7:1C:66:65:13:F8:EA:68:60:98:07:7A:4F:94:DE:A2:3C:D9:DC. Never commit the archive, private key, or password. The unavailable preview debug key is a different key and does not block Play uploads.

Unsigned source: release cockro-auto-91-5, commit d3f50dc8cbb6578a2c13715cf225b562252a88f4; SHA-256 f15789121b57c94dec20fb0d954f50f308722f522e2e9397b264a175e0dca6bb. Signed output: Cockro-91-play-signed.aab, saved separately with the owner's files. jarsigner verification passed and Play accepted the signing identity.

This release uses Android API 26+ and has no advertising-ID permission or ads SDK. Play's per-release option to publish without AD_ID was selected; the app-wide declaration used by older tracks was not changed. Device support changed, and there is no obfuscation mapping file. It is an offline game test, not online multiplayer. No physical-device test is claimed.

These verified facts supersede earlier statements in automatic-patches.md and PR #4 that signing remained blocked and no Play upload had occurred.
