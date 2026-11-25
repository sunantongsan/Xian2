import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,damage,maxHP,combatStats,validSave} from '../web/core.js';
import {buyShopGear,gearShopPrice,equip,makeItem,rollDrop} from '../web/gear.js';
import {merchantHTML} from '../web/shop-view.js';
import {issueRewardTicket,applyVerifiedReward} from '../server/rewarded-ads.js';

test('the merchant sells three permanent divine items at the displayed level and price',()=>{
 const s=fresh('sword-cockro');s.level=20;s.stones=1e12;
 const html=merchantHTML(s,()=>'',x=>x);
 const ordinary=structuredClone(s);
 for(const slot of ['weapon','ring','amulet']){
  ordinary.equip[slot]=makeItem(slot,2,3);
  const cost=gearShopPrice(slot,2,'divine'),before=s.stones;
  assert(html.includes(`data-slot="${slot}" data-tier="2" data-term="divine" data-price="${cost}"`));
  assert(buyShopGear(s,slot,2,'divine'));
  assert.equal(s.stones,before-cost);
  const item=s.bag.at(-1);assert.equal(item.expiresAt,undefined);
  assert.equal(equip(s,item.id),null);
 }
 const loaded=validSave(s);
 assert.deepEqual(loaded.equip,s.equip);
 ordinary.hunterBoostUntil=Date.now()+1800000;
 assert(damage(loaded)>2*damage(ordinary));
 assert(maxHP(loaded)>maxHP(ordinary));
 assert(combatStats(loaded).defense>combatStats(ordinary).defense);
 assert.equal(rollDrop({level:20,boss:true},()=>0).rarity,3);
});

test('invalid purchases leave the wallet and bag untouched',()=>{
 const s=fresh('sword-cockro');s.stones=4999;
 for(const [slot,tier,term] of [['weapon',0,'divine'],['ring',1,'divine'],['helm',0,'divine'],['weapon',0,'free']]){
  assert.equal(buyShopGear(s,slot,tier,term),false);
 }
 assert.equal(s.stones,4999);assert.deepEqual(s.bag,[]);
 s.bag=Array(40).fill(s.equip.weapon);
 assert.equal(buyShopGear(s,'ring',0,'divine'),false);assert.equal(s.stones,4999);
});

test('verified hunter videos extend time once per reward, keep one multiplier and expire',()=>{
 const s=fresh('sword-cockro'),now=Date.now(),before=damage(s,now);
 const claim=id=>{
  const ticket=issueRewardTicket(s,'hunterBoost',now);
  const data={custom_data:ticket.nonce,transaction_id:id,timestamp:String(now)};
  assert(applyVerifiedReward(s,data,now));assert.equal(applyVerifiedReward(s,data,now),false);
 };
 claim('video-1');assert.equal(s.hunterBoostUntil,now+1800000);
 claim('video-2');const restored=validSave(s);assert.equal(restored.hunterBoostUntil,now+3600000);
 assert.equal(damage(restored,now),Math.round(before*1.35));
 assert.equal(damage(restored,now+3600000),before);
});
