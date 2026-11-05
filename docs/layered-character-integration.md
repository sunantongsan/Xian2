# Supplied 32-frame character integration

Integrated the three supplied separated-weapon packages into `drawHero`:
Cockro (laser sword / energy axe), Dragonfly (single / twin emitter), and
Scorpion (round / hex gauntlets). Existing species IDs and saved stats stay intact.
Cricket and legacy characters retain their existing renderer.

The 32 authored cells provide four distance-driven walking directions, four
attack frames, four skill frames, four non-looping death frames, idle, guard,
hurt and recovery. Authored left walking is not mirrored twice. Source layer
order and pivots are preserved. Atlas packing trims only transparent margins;
lossless WebP retains source resolution. Weapons follow equipped gear: no item
is unarmed, tiers 0–5 use the first shape, tiers 6+ use the second. The existing
server equipment validation remains authoritative. Snapshot appearance is
shared with remote/offline actors; previews and inventory read the same rule.
An absent visual field from an older server falls back to the first weapon.

Assets load as a complete set before switching renderer, so a partially loaded
character never loses limbs or weapons. Local death animation continues while
the respawn modal pauses gameplay. Source packages remain in the user's files.
Rebuild with `python3 tools/pack-layered-heroes.py PATH_TO_EXTRACTED_PACKAGES`.

Validation: 24 relevant Node tests pass, including actual WebSocket character
creation, equipment snapshots, progression boundaries, animation and PvP.
288 frame/weapon combinations were rendered with Node Canvas and compared with
original package compositions (premultiplied colour tolerance 4/255).
Contact sheet inspected. Client syntax and server bundle build pass.
The broad local suite has unrelated missing audio/source fixtures in this
partial checkout; no claim of a complete suite pass. Physical Android,
full browser gameplay, updater and production deployment are not verified.

This does NOT supply five additional evolved body designs or distinct job
skills. Names at 20/60 still come from the progression candidate; weapon tier
appearance is independent of job stage. Flight remains deferred as requested.
Do not describe the entire evolution/art release as complete.

Memory limit: each species uses nine 1024px pages (36 MiB decoded RGBA),
108 MiB if all three are resident, in addition to existing game assets.
Android memory profiling is needed before release; source resolution was
preserved rather than silently reducing visual quality.
