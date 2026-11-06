# COCKRO original upload signing key

The original upload key is retained in the owner's private ChatGPT file collection as `COCKRO-upload-key-backup.zip` (created 2026-10-08). Search by that exact filename, not only `.jks` or `keystore`: the archive contains a PKCS12 `.p12` key. A local legacy copy was recovered at `/workspace/scratch/COCKRO-upload-key-backup.zip` on 2026-10-30; local scratch paths are not durable.

Do not request a key reset or ask the owner to recreate a key until checking this exact archive. Keep the archive and its contents private; never commit it or print its password. Alias: `upload`. Public upload certificate SHA-256: `44:3C:10:6C:A7:C2:48:98:F4:15:F2:B9:1F:C7:1C:66:65:13:F8:EA:68:60:98:07:7A:4F:94:DE:A2:3C:D9:DC`.

Use password-file input to jarsigner, not command-line password text. The signed code-103 AAB was accepted by Google Play and published to internal testing on 2026-10-30. This confirms upload-key compatibility; it does not prove end-to-end Google login on a physical phone. Do not uninstall an existing tester's app or clear its data to upgrade, because guest account access depends on the locally stored token.
