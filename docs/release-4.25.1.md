# COCKRO 4.25.1

Client 4.25.1; backend 4.25.0. Existing save and character IDs are preserved.

- New painted transparent WebP merchant robot and twelve-item sci-fi atlas; class-specific weapons, armor, credit coins and alloy on the ground. Loot remains 8 seconds and proximity collection remains server-owned.
- MERC-01 on the ship plaza opens the game-currency shop. Server requires town and <=150 world units for purchases and currency exchange. Remote purchasing is rejected without spending currency.
- Weapon tiers 10–210 in increments of ten; existing tier indices 0–5 preserved. Shop displays required level and attack stat. Both purchase and equip enforce level.
- Google-authenticated device sessions persist until explicit server-side revocation. Previously expired sessions remain rejected. New anonymous accounts cannot create characters in production. Existing legacy characters remain accessible; they must link Google before logout to retain recovery access.
- Remembered accounts enter roster directly; login is no longer displayed on creation/roster. Explicit logout in settings revokes session and clears local tokens. Real native Google chooser/callback was not exercised on an Android device in this validation.
- HUD work capped at 10 Hz while simulation/rendering remain per frame; unused forge serialization avoided. Remote actors interpolate visuals over 100 ms without changing combat coordinates, and large teleports snap immediately. Per-connection event cursor eliminates retransmission of prior visual combat events.
- Synthetic 100-snapshot benchmark with 80 retained combat events: 3,234,999 bytes before vs 2,467,749 after (24% reduction). This is a network payload measurement, not a phone FPS claim.
- Cart now opens store only. No real-money items are offered: existing native app has no Google Play Billing integration/product catalog. No simulated payment or paid-item fulfillment was introduced.
- Confirmed revival resets death animation and closes the stale defeat dialog.

Validation: 165 automated tests passed, syntax check and bundled server build passed. VPS release workflow 41162721508 completed successfully including live production anonymous-registration rejection and unsigned SSV rejection. Backend health reports 4.25.0. Browser QA confirmed remembered roster, live world, robot interaction, potion purchase (+1, -50 G), weapon purchase (-250 gold), locked higher-level weapons, and cart separation. QA purchases used existing QA4221 test character's game currency only.

4.25.0 published archive verified SHA-256 d97e29859220683cd811dcf1f7e736e54b54bb39300b7f190cb9f6c847031f26, 21,210,735 bytes, all 107 manifest file hashes matched. Final 4.25.1 client verification follows below.

Final client 4.25.1: SHA-256 360817b7094d125baf5f572acb9ca4c30d8ddb06db0caac025a012c04f9e8352; 21210831 bytes; all 107 manifest entries verified.
