# COCKRO MAN Thai/English and icon draft

Based on feature/free-checkin-gifts at 28868df6274fca5ac15806f16e6f537dff8dc99a.

Implemented:
- Account language preference persisted by game server, available on roster and world handshake.
- Country TH selects Thai; other known ISO country codes select English. When country is absent, Google identity locale (when supplied) then device locale is used. Country is not inferred from names or email.
- Manual selection takes priority, survives login/restart and remains account scoped.
- Text-only settings with Thai / English selector and save acknowledgement without leaving the world.
- Initial translation catalogue, authored-text translation preserving interpolated player names and chat.
- New red/cyan COCKRO MAN launcher icon and 512px Store icon.

Validation: 23 tests passed covering language selection, persistence, invalid values, live socket language save, account lifecycle, Google return and reconnect.

Release blockers (do not publish this branch yet):
- English catalogue is incomplete: remaining game descriptions, shop/account/help copy, NPC and skill/item names need translation and review. Missing strings intentionally retain original Thai rather than silently erase text.
- Finish UI coverage, verify all screens in both languages on phone sizes.
- Build new signed Android bundle and test install (launcher icon requires a new bundle; web patch alone cannot replace launcher icon).
- Deploy compatible language server and patch together after validation; do not deploy the current incomplete translations.
- Upload new icon to both Store listings, then combine with draft names COCKRO MAN ฮีโร่แมลง / COCKRO MAN. No Play review has been submitted by this code change.
