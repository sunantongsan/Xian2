# Adventure patch 4.55.0

Entry returns to the existing offline story engine, not room-mode. It preserves
story-test-v1 progress, online/account saves and room-campaign-v1 separately.
Existing combat, skills, inventory, upgrades, town, map routes and monster art
remain. Thirty quests across six chapters include hunting, gathering and bosses.
Tapping the objective navigates, fights, collects and returns to claim one quest.
Manual movement stops automation. No new native APK or GitHub Actions required.

New presentation uses the owner's town and field paintings on the welcome,
chapter/quest and victory screens. Reward icons use existing item artwork.
A successful automated or manual claim opens a completion scene with the actual
credited rewards, story outcome, continue and town buttons. Closing or revisiting
this screen never grants currency. Direct story NPC taps now use offline services.

This is an incremental adventure revision, not an Archero recreation or a claim
that all art/animation concerns are resolved. Review phone layout and combat on
an actual device; browser and automated tests cannot certify Android performance.

## Emergency recovery

Verified 4.53.0 full patch and SHA-256 are recorded in `recovery-4.53.0.json`.
The immutable deployment serves that archive independently of the production
alias. Do not remove that deployment or either backup branch:

- `backup/pre-adventure-4.53.0-20261117` — before room campaign
- `backup/room-trial-4.54.0-20261117` — before this adventure revision

For installed clients, restore the full web tree from the first backup on a new
recovery branch, set web/release.json version ABOVE the currently installed
release (e.g. 4.55.1 if 4.55.0 is still current), then run the normal tests and
build_update_feed.py and deploy production. Do not merely point latest.json at
4.53.0: native version checks may reject downgrades. The unchanged engine remains
88. Do not clear app data or rewrite save keys. The separate 4.53 archive is also
available for the existing native manual patch picker where supported.

The backup is game code/assets. It is not a new backup of the online server's
player database or of local saves on players' phones.
