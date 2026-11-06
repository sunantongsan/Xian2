# COCKRO 4.38 progression
Four attribute points are awarded per new level. Versioned legacy-level allowances preserve previously allocated and unused points. XP requirements are 130% of v2, rounded up; migration preserves progress once. Species IDs, inventory, currency and earned levels are unchanged.

At levels 20 and 60 the four insect species derive their job identity and appearance. Base HP, attack, MP and defense components gain factors 1.20 and 1.45 respectively (not compounded); equipment and allocated attributes are not multiplied by this bonus. Existing town buffs apply afterward. The first six class skills retain their IDs, ranks, slots, MP costs, cooldowns and targeting but gain 10% / 20% skill power. The first three receive job-specific names. These are evolved versions of the existing attacks, not new combat mechanics.

Monster HP and damage rise smoothly by up to 10% across levels 20–30 and another 12% across 60–70. XP, gold, elite/boss rank and species toughness remain unchanged. This avoids an enemy difficulty jump at the unlock level.

All three layered heroes and five supplied mutation looks are integrated. Baked props in the five new sheets remain part of their artwork; only the three layered sets support separate weapon shapes. Flight remains deferred.

Wire protocol cockro-online-3 prevents old clients from misinterpreting four-point progression. Account token keys remain unchanged. Old clients must restart and download the patch. Server startup creates the immutable before-4.38.0-progression backup. Deploy the verified server artifact first, then the matching client feed.

Validation includes save/reconnect preservation, evolution boundaries, stable skill slots/ranks, smooth monster scaling, the full Node suite, browser render checks and native Android unit/build/lint jobs. Check the exact release run before publication. Physical Android performance is not established by these automated checks.
