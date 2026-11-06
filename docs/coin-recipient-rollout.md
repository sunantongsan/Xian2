# COCKRO 4.46.1 recipient purchase rollout

Implemented on feature/coin-recipient-celebration:
- Character wallet selector and named confirmation before native Google Play checkout.
- Existing native setObfuscatedAccountId / setObfuscatedProfileId receives selected own character profile.
- Server validates Google receipt owner and resolves destination only among the signed-in account's four character slots.
- Offline recipients are credited through the live sleeper actor when present; persistence precedes consumption.
- Durable receipt notifications shown on recipient login; acknowledgement never modifies balance.
- Coin artwork animation, gold celebration dialog and existing upgrade-success sound, respecting sound setting.
- Thai/English copy. Restore cannot redirect to a client-supplied destination.

Validation: 303 local tests passed. CI run 42178043118 build and stage both succeeded.
Existing Android bridge is sufficient; no native API change.

Staged server and guarded root installer:
 /srv/cockro-deploy/billing-stage/online-server.cjs
 /srv/cockro-deploy/billing-stage/coin-recipient-setup.py
 /srv/cockro-deploy/billing-stage/bundle.sha256

NOT deployed to production yet. VNC button on provider panel did not open after reload. Old VNC session expired.
Do not publish client release until recipient-aware backend is installed.
Installer expects previous production SHA c87e67e009e0e6f94ed5771b236dccc99e9d03c662f1e0e275408bee69e0dcb1, backs up existing server, probes 4 Google products, verifies candidate checksum and health, and rolls back on failure.
Run as root from stage: python3 coin-recipient-setup.py deploy
Then deploy exact reviewed Git SHA to Vercel project cockro-game-updates (team_8dbI49p4Y8SgcCI089NqXzZf), verify latest.json version 4.46.1 and patch hash.
The backend health release remains 4.45.0; feature is indicated by billingRecipients and billingNotices in welcome.

Remaining verification: real Android test checkout under licensed Play account, destination character balance, restore duplicate protection and celebration on recipient login. Local browser visual review was blocked, so mobile layout/animation appearance remains unverified.
Google Play chooses its payer account; game sign-in is not a supported payer-account switch. Do not ask users to remove their phone accounts.
