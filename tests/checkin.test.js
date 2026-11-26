import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,validSave} from '../web/core.js';import {DAILY_GOLD,claimCheckin,checkinStatus,thaiDay} from '../web/checkin.js';import {World} from '../server/world.js';
const day=Date.parse('2026-10-29T12:00:00+07:00'),D=86400000;
test('daily check-in gives rare gold only, once daily across reload',()=>{const s=fresh('sword-cockro'),g=s.gold;assert.equal(claimCheckin(s,day),20000);assert.equal(s.stones,20000);assert.equal(s.gold,g);assert.equal(claimCheckin(s,day+10000),0);assert.equal(claimCheckin(validSave(s),day+20000),0);});
test('seven-day rewards, wrap, missed-day reset and backwards clock rejection',()=>{const s=fresh('sword-cockro');for(let i=0;i<7;i++)assert.equal(claimCheckin(s,day+i*D),DAILY_GOLD[i]);assert.equal(s.stones,430000);assert.equal(claimCheckin(s,day+7*D),20000);assert.equal(claimCheckin(s,day+9*D),20000);assert.equal(claimCheckin(s,day+8*D),0);assert.equal(claimCheckin(s,NaN),0);});
test('Bangkok midnight resets independently of UTC calendar date',()=>{const before=Date.parse('2026-10-29T16:59:59Z'),after=before+1000;assert.equal(thaiDay(after),thaiDay(before)+1);const s=fresh('sword-cockro');assert.equal(claimCheckin(s,before),20000);assert.equal(claimCheckin(s,after),30000);});
test('free check-in uses server day and reward, rejects repeats across reload',()=>{const w=new World(),p=w.join('calendar',fresh('sword-cockro'));w.command(p,{type:'op',op:'dailyCheckin',amount:999999,timestamp:day+86400000},day/1000);assert.equal(p.s.stones,20000);assert.equal(p.opResult.ok,true);assert.equal(checkinStatus(p.s,day).claimed,true);w.command(p,{type:'op',op:'dailyCheckin'},day/1000+1);assert.equal(p.s.stones,20000);assert.equal(p.opResult.ok,false);p.s=validSave(JSON.parse(JSON.stringify(p.s)));w.command(p,{type:'op',op:'dailyCheckin'},day/1000+2);assert.equal(p.s.stones,20000);w.command(p,{type:'op',op:'dailyCheckin'},day/1000+86400);assert.equal(p.s.stones,50000);});

import {issueRewardTicket,applyVerifiedReward} from '../server/rewarded-ads.js';
import {issueTestTicket} from '../server/test-rewards.js';
test('daily reward waits for verified callback, survives retry and cannot grant twice',()=>{const s=fresh('sword-cockro'),t=issueRewardTicket(s,'dailyCheckin',day);assert.equal(s.stones,0);const params={custom_data:t.nonce,timestamp:String(day+20000),transaction_id:'daily-ad-1'};assert(applyVerifiedReward(s,params,day+20001));assert.equal(s.stones,20000);assert.equal(applyVerifiedReward(s,params,day+30000),false);assert.throws(()=>issueRewardTicket(s,'dailyCheckin',day+40000),/already_claimed/);assert.throws(()=>issueTestTicket(fresh('sword-cockro'),'dailyCheckin',day),/verified_ad_required/);});
test('ad started before Thai midnight credits that day and leaves new day claimable',()=>{const before=Date.parse('2026-10-29T16:59:50Z'),s=fresh('sword-cockro'),t=issueRewardTicket(s,'dailyCheckin',before);applyVerifiedReward(s,{custom_data:t.nonce,timestamp:String(before+20000),transaction_id:'midnight-ad'},before+21000);assert.equal(s.checkin.lastDay,thaiDay(before));assert.equal(checkinStatus(s,before+21000).claimed,false);assert.equal(checkinStatus(s,before+21000).day,2);});

test('verified triple uses the quoted streak on all seven days and pays once across retries',()=>{
 const s=fresh('sword-cockro');
 for(let i=0;i<7;i++){
  const now=day+i*D, before=s.stones, a=issueRewardTicket(s,'dailyCheckinTriple',now),b=issueRewardTicket(s,'dailyCheckinTriple',now);
  const cb=t=>({custom_data:t.nonce,timestamp:String(now+20000),transaction_id:t.nonce});
  assert.equal(s.stones,before);assert.throws(()=>issueTestTicket(s,'dailyCheckinTriple',now),/verified_ad_required/);
  applyVerifiedReward(s,cb(a),now+20001);assert.equal(applyVerifiedReward(s,cb(a),now+20002),false);
  applyVerifiedReward(s,cb(b),now+20003);assert.equal(claimCheckin(s,now+20004),0);
  assert.equal(s.stones-before,3*DAILY_GOLD[i]);
 }
 assert.equal(s.stones,1290000);
});
test('overlapping free claim and late verified triple top up the quoted day across restart and midnight',()=>{
 const before=Date.parse('2026-10-29T16:59:50Z'),s=fresh('sword-cockro'),ticket=issueRewardTicket(s,'dailyCheckinTriple',before);
 assert.equal(claimCheckin(s,before+100),DAILY_GOLD[0]);assert.equal(claimCheckin(s,before+20000),DAILY_GOLD[1]);
 const restored=validSave(s);
 applyVerifiedReward(restored,{custom_data:ticket.nonce,timestamp:String(before+25000),transaction_id:'delayed-triple'},before+26000);
 assert.equal(restored.stones,3*DAILY_GOLD[0]+DAILY_GOLD[1]);assert.equal(restored.checkin.lastDay,thaiDay(before)+1);
});

test('weekly check-in halving applies to each free claim and each server-verified ad quote',()=>{
 const free=fresh('sword-cockro'),ads=fresh('sword-cockro');
 for(let i=0;i<7;i++){
  const now=day+i*D;
  assert.equal(claimCheckin(free,now,2),DAILY_GOLD[i]/2);
  const ticket=issueRewardTicket(ads,'dailyCheckinTriple',now,2);
  const old=ads.stones;
  applyVerifiedReward(ads,{custom_data:ticket.nonce,timestamp:String(now),transaction_id:ticket.nonce},now);
  assert.equal(ads.stones-old,3*DAILY_GOLD[i]/2);
 }
 assert.equal(free.stones,215000);assert.equal(ads.stones,645000);
});
test('an ad quoted before the threshold keeps its promised amount, including legacy tickets',()=>{
 for(const legacy of [false,true]){
  const s=fresh('sword-cockro'),ticket=issueRewardTicket(s,'dailyCheckinTriple',day,1);
  if(legacy)delete ticket.restore.divisor;
  assert.equal(claimCheckin(s,day+1,2),10000);
  applyVerifiedReward(s,{custom_data:ticket.nonce,timestamp:String(day+20000),transaction_id:ticket.nonce},day+20001);
  assert.equal(s.stones,60000);
 }
});
