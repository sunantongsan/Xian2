# Account identity display 4.46.2

Production source 546db06327da7edc773b7d9ce1d409f49a32e89f. Backend workflow 42183458511 completed successfully; deployed server SHA256 de736f9fcc1f02e4db1f1f14ce9c617f9d9393844fe9938835f1999032e0a848. Existing deploy helper used with old-SHA guard and rollback backup /srv/cockro-deploy/online-stage/account-identity-before.cjs. Health OK.

Vercel production dpl_H99JmQyb7TcWHYaKYQRGTJ6nswke READY on cockro-game-updates.vercel.app.

Account status now exposes only the authenticated owner's stored email/display name plus existing player ID. Identity details are copied from server-validated Auth /user response at Google login. Never derive identity from the device Play payer. Legacy accounts with no recorded email explicitly show that state and offer verifyAccount. That flow requires the same existing Auth UID before any mapping/profile/session writes; a different Google account is rejected, preserving original characters. No extra admin access or Supabase schema changes were made.

Account UI displays email, display name when present, player ID, own-character roster and separate Google Play payer explanation in Thai and English. 304 local tests passed, including same-account verification, foreign-account rejection, persistence and no token/UID exposure. CI tests/build also passed. Real user's original Google identity still needs one verification through their mobile device; do not claim their current game account is confirmed to be sunan until that succeeds. Existing Google Play payer mismatch remains a separate issue.
