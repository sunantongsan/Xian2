# COCKRO MAN 4.46.0 — Thai/English

Based on feature/free-checkin-gifts at 28868df6274fca5ac15806f16e6f537dff8dc99a.

## Implemented
- Account preference is saved on the server and returned by roster and game handshakes. Manual choice takes priority across devices.
- Known account country TH selects Thai; other known countries select English. If country is unavailable, use account identity locale, then device locale. Google does not always supply country; it is never inferred from names/email.
- Text-only settings save through the active socket without reconnecting. Failed saves retain the previous language and show a retry message.
- More than 1,200 authored phrase translations cover menus, equipment, skills, monsters, maps, shops, gifts, account pages, NPCs and notices. Existing map/monster objects and chat controls update when switching language.
- Interpolated character names, player shops, chat and gameplay IDs are preserved. No network translation service is used.
- Android startup, download/resume and billing messages use Thai/English. The last game language is saved locally for the next native startup; initial startup uses the device language. The game then applies the authenticated account preference.
- English account deletion confirmation is DELETE COCKRO. The server retains the original Thai confirmation for old clients. Password/recent Google verification requirements are unchanged.
- New red/cyan COCKRO MAN icon, Android label COCKRO MAN, native version 4.46.0 (114), patch version 4.46.0.

## Validation
`language-validation.yml` runs the complete Node suite, syntax checking, server bundling, browser phone checks, Android unit tests and release bundle compilation. Browser checks cover six screens at 800×360, 640×320 and 360×640, switching both directions, failure rollback, text-only settings and preserving an unsent Thai chat draft.

Build artifacts contain the matching patch feed and server bundle, phone screenshots, and an **unsigned** Android AAB. An unsigned AAB cannot be uploaded to Play. Physical Android installation and real Google Billing checkout are not simulated by browser tests.

## Release order
1. Back up server data and deploy the compatible server bundle, preserving environment settings and account saves.
2. Deploy the generated 4.46.0 update feed and content-addressed patch files together. Validate account language saving with both an old and a new client.
3. Sign the native AAB with the existing upload key. Check that version code 114 is still unused in Play Console before upload.
4. Submit the native update with release notes covering Thai/English and the icon. The existing Store-listing review is separate; this source change does not withdraw it.

No production deployment or Play submission is performed by the validation workflow.
