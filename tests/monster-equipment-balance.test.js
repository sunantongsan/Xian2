import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh, damage} from '../web/core.js';
import {makeItem, tierForLevel} from '../web/gear.js';
import {forestMonster} from '../web/forest-species.js';
import {starMonster} from '../web/star-data.js';

test('same-level field monsters withstand ordinary attacks and reward weapon investment', () => {
  for (let level = 1; level <= 120; level++) {
    const player = fresh('sword-cockro');
    player.level = level;
    player.mutationStage = level >= 60 ? 2 : level >= 20 ? 1 : 0;
    player.attributes.str = Math.floor((level - 1) * 1.6);
    player.upgrade = Math.min(20, Math.floor(level / 5));
    const tier = tierForLevel(level);
    player.equip.weapon = makeItem('weapon', tier, 0);
    const monster = level <= 60 ? forestMonster(level) : starMonster(level);
    const hits = () => Math.ceil(monster.hp / damage(player));
    const ordinaryHits = hits();
    assert(ordinaryHits >= 7 && ordinaryHits <= 27, 'ordinary weapon at level ' + level);

    player.equip.weapon = makeItem('weapon', tier, 3);
    player.equip.weapon.plus = 12;
    assert(hits() <= ordinaryHits - 2, 'legendary weapon at level ' + level);
  }
});
