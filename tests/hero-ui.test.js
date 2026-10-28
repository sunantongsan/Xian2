import test from 'node:test';
import assert from 'node:assert/strict';
import {HERO_CLASSES,heroIdentity,uiArt} from '../web/hero-ui.js';
import {fresh,validSave} from '../web/core.js';
test('four requested heroes and only finished combat prototype selectable',()=>{assert.deepEqual(HERO_CLASSES.map(h=>h.name),['แมงสาบแมน','แมงป่องแมน','แมลงปอเกิล','จิ้งหรีดแมน']);assert.deepEqual(HERO_CLASSES.filter(h=>h.playable).map(h=>h.id),['sword-cockro']);});
test('legacy progression survives and has a readable identity',()=>{for(const id of ['sword-male','demon-female','sword-cockro']){const save=fresh(id);save.gold=12345;const restored=validSave(save);assert.equal(restored.gold,12345);assert.equal(restored.hero,id);assert.ok(heroIdentity(id).name);}});
test('atlas indices are bounded and decorative art is hidden from screen readers',()=>{for(let i=0;i<16;i++)assert.match(uiArt(i),/aria-hidden="true"/);assert.throws(()=>uiArt(16),RangeError);});
