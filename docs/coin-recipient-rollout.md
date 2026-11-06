# COCKRO 4.46.1 recipient purchase rollout

Production deployed 2026-11-06.

Implemented:
- Own-account character wallet selector and named confirmation before native Google Play checkout.
- Existing native obfuscated account/profile IDs bind the selected recipient to the verified Google receipt.
- Server resolves recipients only within the signed-in account's four slots, uses live sleeper state when present, persists credit before consumption and prevents duplicate credit.
- Durable recipient notifications, coin animation, gold celebration and existing upgrade-success sound respecting audio settings.
- Thai/English copy. Restore cannot redirect a verified receipt to a client-supplied destination.

Backend deployed using existing authorized self-hosted runner and sudo cockro-deploy-online helper, not the staged root installer. Workflow run 42179191520 succeeded; public health is OK. Backend SHA256: 1002a040733ace0f51aa23659ec2f474644dcdfe51af0cc5dffbd0c290231e9d.
Previous server backup: /srv/cockro-deploy/online-stage/coin-recipient-before.cjs. Previous SHA256: c87e67e009e0e6f94ed5771b236dccc99e9d03c662f1e0e275408bee69e0dcb1.
Relay configuration and credentials were preserved. Backend health release string remains 4.45.0; welcome now contains billingRecipients and billingNotices.

Client production source: da4677f5f582bc441c9d4f44d69770fcc23dbedc.
Vercel production deployment: dpl_7sz7r8YbVK8s4CKpTaaSoLw7EcFi, READY, alias https://cockro-game-updates.vercel.app.
Production latest.json verified version 4.46.1. Downloaded complete 43,169,975-byte patch and verified its SHA256 3faa1a2e1e36594a9ab5c34a7a342674f858d770a1ceae5667f4f053b4f78f91, plus all 194 per-file hashes. Temporary fake-payment review harness is absent from production archive.

Validation: 303 local tests passed; CI build/stage succeeded. Hosted browser preview at 800x360 verified recipient selector, named confirmation and celebration. Confirmation clientHeight=scrollHeight=286; celebration clientHeight=scrollHeight=261. Preview used fake purchases only. Existing Android bridge requires no native API change.

Remaining external verification: real Android license-test checkout, target-character credit, restore duplicate protection and celebration on login. Do not claim real Google purchase end-to-end testing has occurred.
Google Play chooses its payer account; game login does not switch the payer. Existing license tester is sunan.tongsan@gmail.com. Do not ask users to remove phone accounts. Confirm a test payment method before the user completes a test purchase.
