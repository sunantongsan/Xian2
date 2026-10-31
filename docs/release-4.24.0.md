# COCKRO 4.24.0 — Temperament, ground loot and persistent PvP

User explicitly selected PvP everywhere, including town/landing plaza, against both online and offline characters.

## Monsters
- Restore textured attack discharge; hide advance aim/area telegraphs. Attack animation and actual discharge still render.
- All monsters have compact, width-limited names and level. Red: bosses and every third species initiate attacks within 230 world units. Yellow: retaliate only after being hit. Same rule is shared with the client fallback.
- HP bars still appear only below full HP. Selection circles remain selected-target only.

## Ground loot
- Monster kills award XP/kill credit immediately. Money G, alloy materials and equipment become authoritative ground objects, visible with item art, name and count.
- Objects remain eight seconds and can be collected once by their living owner within 65 world units, with a clear walkable path. A 0.35-second initial display period makes drops visible even when already close.
- Full equipment inventory leaves the object on the ground, instead of silently selling it. Expired items are removed without inventory credit. Ground drops are ephemeral across service restarts.

## PvP / offline presence
- Tap a player and select the explicit attack action. Basic attacks and equipped skills validate target, map, range, line of sight, cooldown, MP and server-owned stats. Auto-hunt does not randomly attack players.
- Online players control their own retaliation. Offline characters remain in place and defend against their attacker with in-range equipped skills/basic attacks; HP potions at <50%, MP potions at <25%, using existing quantities and cooldowns. They do not hunt, chase, collect or gain XP unattended.
- Town PvP is enabled. Town passive healing and town-buff healing cannot defeat the combat rules during a fight. Teleport commands are blocked for ten seconds after PvP damage; walking away remains possible.
- Logout retains position, HP, MP, inventory and cooldowns. Reconnect replaces the offline actor rather than duplicating it. Character deletion removes its offline actor. Offline actors do not occupy online player slots.
- Presence survives server restart. Characters without new presence data appear only after their first login on this release; no historical logout coordinates are invented.
- Reports record opponent name, outcome, damage dealt/taken, HP/MP potions and timestamp; last 30 retained. Unread results appear on return and are available from the combat-history menu. In-progress fights checkpoint as interrupted for crash recovery.
- Defeated offline actors remain defeated until their owner revives. Ten-second revive protection prevents immediate spawn killing. No PvP currency/XP rewards, inventory theft or level/equipment penalties are introduced.
- PvP damage starts at 45% of normal attack/skill power before target defense; needs live balancing. Offline characters defend in place, so melee cannot hit a ranged attacker outside weapon/skill reach.

Validation: 159 local Node tests, including real WebSocket offline defense/potion consumption, persisted defeat through server restart, reconnect position, report acknowledgment, PvP target/range/cooldown/MP validation, no repeat death reward, loot pickup/expiry/ownership/full bag and temperament. Client/server syntax and bundled service compile pass. Physical Android performance not measured.
