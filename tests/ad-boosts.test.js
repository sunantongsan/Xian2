import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,validSave,damage,combatStats} from '../web/core.js';
import {gearTotals,itemStats,tierForLevel,DIVINE_RARITY} from '../web/gear.js';
import {knownSkills,SKILL_BOOKS} from '../web/skills.js';
import {expMultiplier} from '../web/exp-tickets.js';
import {AD_BOOSTS,grantAdBoost} from '../web/ad-rewards.js';
import {issueRewardTicket,applyVerifiedReward} from '../server/rewarded-ads.js';
import {issueTestTicket,completeTestTicket} from '../server/test-rewards.js';
test('four ad boosts: warrior x2 30m, divine weapon 30m, all skills 20m, EXP x5 30m',()=>{
 assert.deepEqual(Object.entries(AD_BOOSTS).map(([id,b])=>[id,b.minutes]),[['hunterBoost',30],['divineTrial',30],['skillTrial',20],['expTrial',30]]);
});
test('warrior buff doubles attack and defense; views stack time without limit',()=>{
 const s=fresh('sword-cockro');s.level=50;const atk=damage(s),def=combatStats(s).defense,now=Date.now();
 grantAdBoost(s,'hunterBoost',now);assert.equal(damage(s),atk*2);assert(Math.abs(combatStats(s).defense-def*2)<1e-9);
 for(let i=0;i<5;i++)grantAdBoost(s,'hunterBoost',now);assert(Math.abs(s.hunterBoostUntil-(now+6*30*60000))<5);
 assert.equal(validSave(JSON.parse(JSON.stringify(s))).hunterBoostUntil,s.hunterBoostUntil);
});
test('divine trial lends a divine weapon of the hero tier at any level, then ends',()=>{
 for(const level of [1,37,200]){const s=fresh('sword-cockro');s.level=level;const before=gearTotals(s).atk;grantAdBoost(s,'divineTrial');
  const trial=itemStats({slot:'weapon',tier:tierForLevel(level),rarity:DIVINE_RARITY,plus:0});assert(gearTotals(s).atk>=trial.atk);assert(gearTotals(s).atk>before);
  s.divineTrialUntil=Date.now()-1;assert.equal(gearTotals(s).atk,before);}
});
test('skill trial opens all eight books for 20 minutes and EXP trial gives x5',()=>{
 const s=fresh('sword-cockro');assert.equal(knownSkills(s).length,0);grantAdBoost(s,'skillTrial');assert.equal(knownSkills(s).length,8);
 s.skillTrialUntil=Date.now()-1;assert.equal(knownSkills(s).length,0);
 assert.equal(expMultiplier(s),1);grantAdBoost(s,'expTrial');assert.equal(expMultiplier(s),5);
});
test('verified ad callbacks deliver every boost, and trial skills fill empty slots',()=>{
 const now=Date.now();
 for(const item of Object.keys(AD_BOOSTS)){const s=fresh('sword-cockro'),tk=issueRewardTicket(s,item,now);assert(applyVerifiedReward(s,{custom_data:tk.nonce,timestamp:String(now+1000),transaction_id:'tx-'+item},now+2000));assert(s[AD_BOOSTS[item].key]>now);
  if(item==='skillTrial')assert.deepEqual(s.equipped,SKILL_BOOKS.slice(0,5).map(b=>b.id));}
 const s=fresh('sword-cockro'),tk=issueTestTicket(s,'divineTrial',now);completeTestTicket(s,tk.nonce,now);assert(s.divineTrialUntil>now);
 assert.throws(()=>issueRewardTicket(fresh('sword-cockro'),'cockroCoins',now),/invalid_reward/);
});
