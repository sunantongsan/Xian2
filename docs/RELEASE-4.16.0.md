# COCKRO 4.16.0 / Android 101 — implementation and handoff

## Implemented
- Enhancement +0–+9 for weapon, ring and amulet only. Guaranteed, no destruction. Each next level consumes that many enhancement-alloy items, plus displayed G and premium gold. Other existing equipment remains usable but cannot be newly enhanced.
- One selectable gem per supported item. Swapping returns the previously installed gem. Existing multi-gem saves migrate once, refund excess gems, preserve old >+9 paid base enhancement through legacyPlus.
- Meteor rerolls one special option. HP regeneration 25% per item has exactly 5% probability. Other provisional weights: MP 10%/2s 20%, critical +5% 20%, attack +30 25%, defense +20 20%, max HP +300 10%.
- Regeneration stacks across three equipped slots, ticks each 2 seconds during combat, damage does not reset its clock, no resurrection.
- Rewarded-video undo bound to item ID and roll revision. Only last roll can be restored once; consumes no extra stone but never refunds spent stones. Stale callbacks cannot restore an earlier roll. Production path still requires signed SSV; internal test path remains explicitly test-only.
- Pioneer premium-gold grant +50,000 once per account, additive and persisted. Controlled by internalTestRewards / COCKRO_TEST_REWARDS. New characters still receive 100,000 G. Existing account G is not reset.
- Monsters award G only. Normal equipment drop 1%, elite 15%, boss 100%. Bosses drop 3 alloy; normal monsters have 8% chance of 1 alloy.
- Premium gold buys materials and level-matched rare weapon/ring/amulet. One-way exchange 1 gold -> 1,000 G; no reverse route.
- Daily hunts, boss kills and enhancement tasks award G/alloy once per Thai calendar day.
- Successful confirmed enhancement/socketing shows before/after stats, detailed item icon, celebration and supplied winning audio. Reroll shows current/previous values and video restore control.
- +3/+6/+9 aura tiers, with +9 most prominent. Authoritative aura level sent to other players. Bounded particles with reduced quality mode. Inventory borders show enhancement tiers.
- Restored missing settings function with sound and quality controls. Forge view is not rebuilt repeatedly when unchanged.

## Audio and art
User-supplied audio copied unchanged: sergequadrado-cool-hip-hop-loop-275527.mp3 (quiet background loop); dragon-studio-massive-explosion-2-397983.mp3 (skill, rate-limited); pw23check-winning-218995.mp3 (successful enhancement/reward). Mutes with settings and pauses when document hidden.
Existing detailed gemstone WebP icons retained. New generated image `web/items/equipment-atlas.png` is consumed through CSS background positions, never a placeholder. Built-in imagegen prompt: three equal square cells, navy background, cyan sci-fi sword, ruby gold ring, emerald gold pendant, premium rendered fantasy loot, no labels or watermark.

## Validation and status
118 Node tests pass. Android Gradle release APK and AAB builds with internal test ads and original upload certificate. Native unit tests run; the existing external update-feed test is skipped without its explicit live flag. Two-client local WebSocket smoke passes movement visibility, gear appearance, purchases, save rejection and reconnect persistence.
Visual browser validation is blocked: Chromium download returned an invalid archive; remote browser cannot access the local preview server. No physical Android-device test or real audio listening test was performed.
NOT uploaded to Play Console and NOT deployed to live backend/patch feed. The 4.16 client requires a 4.16 server welcome; it deliberately refuses older servers rather than silently using old economy rules. Do not distribute this APK to players before deploying its backend.
Referral verification/rewards, dungeon content and real-money gold billing are not included in this enhancement implementation. Existing live code100 remains unchanged.

## Deployment order
1. Back up authoritative account JSON data. Do not clear existing accounts or online device tokens.
2. Stage `server/online-server.cjs`, syntax-check, run tests. Use existing process manager and authoritative data directory; never point at preview/smoke data. No credentials included.
3. Deploy backend and client patch together in a maintenance window; health release must be 4.16.0. Keep internal test rewards on only during testing, turn off before production. Server old-app compatibility needs simultaneous client patch rollout; notify testers to restart.
4. Validate one existing account gets +50,000 exactly once across reconnect/restart; validate successful and failed video-restore flows on Android. Verify old balances and compensated gems before broad rollout.
5. Publish Android 101 to INTERNAL track only after validation. APK uses upload certificate, which may differ from Google Play app-signing certificate; do not uninstall a tester's installed app to replace it, as device-token access may be lost. Use Play internal AAB for existing Play-installed accounts.
6. Rollback requires both old client and backend plus pre-migration backup; never blindly load migrated saves into older code.
