# COCKRO MAN changes — 20 November 2026

Base: test/cockro-4502-single-3d at 533702e19b7f6464f3a94ebd2d96f43b20cf60e4, production 7.1.1 / gameplay 4.50.2.

Implemented:
- Named 3D armor materials recolored bright red with gold trim; geometry, skinning and three sword clips unchanged.
- Floating joystick at pointer origin; bounded thumb motion; hidden on release, cancellation, pinch, focus loss, pause and death. Existing tap and two-finger zoom behavior retained.
- Character sheet displays unspent stat points, skill points and current trainingPoints() value together.
- Monster currency drops and pickup credit server-owned COCKRO (`stones`) at the previous numeric drop amount. No conversion of stored G balances. HUD, inventory, forge, shop, potion/pet/ticket/weapon purchases, sales and crafting use COCKRO. G exchange disabled. New G vault transfers/listings and purchases of legacy G listings rejected; existing escrow can still be cancelled. Legacy `gold` save and vault data retained for a future explicit migration decision.

Verification:
- 35 focused automated tests passed: world gestures, palette material isolation, valid/invalid/overflow drops, potion purchases, server-owned pickup ownership/distance/expiry/idempotence, single-character preservation and actual model sword clips/portrait bounds.
- JavaScript syntax, whitespace checks and server bundle build passed.
- Broad suite before adapting the old pickup assertion: 312 passed, 35 failed. Most failures assert the retired G economy; two suites fail due to test harness/workspace dependencies. These failures have NOT all been resolved; do not treat the broad suite as passing.
- Browser visual test blocked: Chromium process cannot create its process-singleton socket in this environment. Android visual/performance verification remains outstanding.

Not released:
- No production server or patch feed changed. No GitHub Actions used.
- No authenticated VPS/VNC session available in this workspace.
- Rebuild and install the server bundle from source with a stopped-service backup and copy-data audit before publishing a coordinated client patch. Never deploy the repository's old bundled server.
- Existing training point calculation is level-derived and does not debit practice points on enhancement. This change displays that existing value; it does not implement an additional practice spending migration.
