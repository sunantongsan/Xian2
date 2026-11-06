# COCKRO 4.18.0 — test starter funds and AURA-01

Based on cockro-4.16.0-forge at f8e476f19955ed4c0966981b58a667858cee185a (4.17 multi-character/UI updates preserved).

- With testRewards enabled, each newly created character receives exactly 1,000,000 G and 50,000 premium gold. Existing G is untouched. Existing one-time pioneer gold marker prevents repeated grants; alternate characters can receive the same once-only grant.
- AURA-01 robot stands near the spawn in Aurora town. Server requires a living player within 120 world units of that NPC and test mode enabled. Two-second request cooldown.
- Buff lasts 60 minutes of wall-clock time, including offline time. Renewing resets the expiry to now + 60 minutes and never stacks. Save normalization preserves remaining expiry.
- HP/MP/attack/defense +200% means 3x unbuffed values. Critical chance is 3x existing chance, capped at 100%; critical damage is unchanged. Movement speed +100% is 2x on client and authoritative server.
- Receiving buff fills HP/MP to new maxima. Expiry clamps current HP/MP to normal maxima without resurrecting. Disabling test mode removes buffs.
- Animated metallic robot, cyan/gold aura, bounded rising particles, two-second activation effect, existing victory sound respecting mute, and HUD countdown. Nearby players see activation and ongoing aura.
- Startup makes a version-specific account backup before serving. Client/server welcome versions must match 4.18.0; deploy backend and patch together.

Validation: 124 Node tests pass, client syntax check and bundled server build pass. Tests include all four character slots, reconnect, existing balance preservation, test-mode disabled, distance/death denial, duplicate grants, buff refresh, expiry and stats. Browser visual/audio and physical Android verification are not complete: local Chromium executable unavailable. No signed APK/AAB built; no live server or patch deployment performed. Android metadata prepared as code102/version4.18.0.
