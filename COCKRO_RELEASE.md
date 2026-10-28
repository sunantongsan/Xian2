# COCKRO 4.3.0 (86)

Xian2 0.1.7 is now the game client for this COCKRO branch. Release application ID remains com.sunantongsan.networkcokcro. The Java namespace remains internal and does not change the installed application ID. Debug previews use .preview so they cannot overwrite a Play installation with a different signing certificate.

The bundle contains only Xian2 web assets, no Godot/3D runtime or assets. Existing 3D source and server remain retained separately. The game is currently offline: local saves, four heroes, ten regions, skills, shops and progression. Supabase Network login, online characters, multiplayer and production rewarded ads are not connected to this client yet. No old save or account data is deleted or imported.

CI runs the 22 existing game tests, syntax and asset checks, Android lint, APK signature and package verification, and creates a preview APK plus unsigned release AAB. Sign the AAB with the existing COCKRO upload key before Play upload. Google Play's existing AD_ID declaration issue must be resolved without bypassing it before rollout.
