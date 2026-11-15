# Insect character art, patch 4.48.3

Eight new appearances: male/female cockroach, ladybug and scorpion; female rhinoceros beetle and dragonfly. Existing male/female mantis remain available.

Settings > Character appearance provides a device-local cosmetic selection. This does not change equipped item IDs, statistics, class, skills or server saves. Other players do not receive this cosmetic selection. "Use equipped armor" automatically uses the female beetle/dragonfly art for those local armor types; other armor types retain their previous renderer.

New atlases are decoded on demand and limited to two retained images. Broken downloads fall back to existing art and retry at a bounded rate. Existing mantis assets remain on the previous loader.

Source limitations are preserved rather than claimed corrected: beetle has 48 poses (two defeat poses per direction); scorpion side rows have 12 poses and hold the last standing pose before kneeling. Generated gait/anatomy is not guaranteed; this patch integrates the user's selected artwork without another movement redesign.

Validation: unit tests check all eight atlas layouts, six actions, four directions and terminal death bounds, cache retention/deduplication/failure behavior. Browser fixture uses actual game settings and renderer, selects all eight new looks and records 32 action/direction samples without JavaScript errors. Android hardware was not tested.
