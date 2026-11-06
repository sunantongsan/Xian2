# COCKRO 4.32.0 / Android 109 candidate

Premium `stones` is displayed as COCKRO coin with new coin artwork; ordinary `gold` remains G. Existing balances and Play product IDs are unchanged. New accounts receive 500 COCKRO coin once into their first character. Additional characters do not grant more welcome coins.

Verified Google accounts can share an account referral code. Another verified account can submit one code once; the inviter receives 500 COCKRO coin on its next character login. Self-referrals and repeat identities are rejected. Delivery is assigned to one character with a durable save receipt before acknowledgement, so retries cannot credit another character. Deletion removes referral membership and account awards from live data and release backups; hashed used-identity evidence remains for repeat-reward prevention.

Account management keeps protected character/account deletion, password reset via Google and purchase history. Security-password labels now correctly cover both deletion actions. **Live Supabase Auth cleanup is still blocked:** game uses project `kfohckvypopaoogmnjuy`; connected Supabase accounts only expose `uzinxxeadejmzxqmqqtx`. Do not claim complete identity deletion or change projects to bypass this. Existing durable pending-deletion reporting remains.

Merchant stands in front of the counter. Buff can be requested from anywhere in town by tapping AURA-01; original `upgrade-success.mp3` is restored for buff acceptance. Existing test-rewards gating, alive/PvP restrictions and cooldown remain. Larger light pillar/rings follow the receiving player.

EXP tickets are purchased with G: x2 = 50,000; x5 = 150,000; x10 = 350,000. Each lasts one wall-clock hour, including offline time. Purchase stores a ticket; use consumes one. Only monster EXP multiplies. Replacement requires confirmation of the exact active expiry and discards remaining time; multipliers never stack. HUD shows multiplier/time.

Compact character sheet separates stats from equipment (equipment remains in bag), reduces text and buttons, and uses responsive summary grids with 40px allocation controls. Portrait and landscape layouts preserve numeric entry and server-confirmed allocation.

Validation: 205 Node tests pass, including real WebSockets, balances, EXP usage, duplicate referrals and interrupted delivery. JavaScript syntax, server bundling, asset containers and integrity-checked patch generation pass locally. Headless Chromium verified no stats scrolling at 390×844, 360×640 and 844×390, stat allocation, ticket purchase/use, and zero page errors. Native validation is recorded separately. This branch is a candidate; it is not a production deployment or Play submission.

## Account flow follow-up

Google-linked accounts now reauthenticate with the same Google identity before confirming account deletion; no additional game password is required. The proof is limited to account deletion, expires after five minutes, and cannot be substituted with a password-reset proof. Legacy unlinked accounts retain the password flow. Character deletion retains its existing password protection. 207 Node tests pass, including wrong-account, expired proof and retry behavior.

Legacy Cockro-Networkv4 Settings.tsx was inspected: its deletion button launches an email request, not an automatic Auth deletion API. Both connected Supabase accounts still expose only uzinxxeadejmzxqmqqtx, while the live app uses kfohckvypopaoogmnjuy. Live login/deletion and production release are pending correct-project access. The previously signed candidate must be rebuilt after this follow-up before submission.
