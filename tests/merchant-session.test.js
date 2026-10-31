import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,readdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createAccounts} from '../server/accounts.js';import {fresh} from '../web/core.js';import {World} from '../server/world.js';
import {TIERS,buyShopGear,itemStats,canEquip} from '../web/gear.js';import {MERCHANT_UV} from '../web/merchant.js';import {MAPS,toWorld,walkable,routeTo} from '../web/maps.js';
import {receiveActor,renderPosition} from '../web/render-motion.js';import {stateForWire} from '../server/state-wire.js';
test('Google device session survives time and restart; logout revokes it without deleting account',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'cockro-session-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const fetcher=async url=>({ok:true,json:async()=>url.includes('/token?')?{access_token:'test'}:{id:'verified-test-user',identities:[{provider:'google'}]}});
 let api=createAccounts(dir,{fetcher});let f=await api.authStart();const a=await api.authFinish(f.flow,'verified-code'),owner=api.resolve(a.token);
 const file=join(dir,'accounts',readdirSync(join(dir,'accounts')).find(x=>x.startsWith('session-'))),data=JSON.parse(readFileSync(file));data.expires=1;writeFileSync(file,JSON.stringify(data));
 api=createAccounts(dir,{fetcher});assert.equal(api.resolve(a.token),owner);await api.manage(a.token,{action:'logout'});assert.throws(()=>api.resolve(a.token),/login_required/);
 f=await api.authStart();const b=await api.authFinish(f.flow,'verified-code');assert.equal(api.resolve(b.token),owner);assert.equal(api.resolve(b.token),owner);
});
test('all ten-level weapons grow, reject underlevel and malformed purchase, preserve old tiers',()=>{
 assert.deepEqual(TIERS.slice(0,6).map(x=>x.level),[1,10,20,30,40,50]);const s=fresh('sword-cockro');s.stones=1e7;
 for(let i=1;i<TIERS.length;i++){assert.equal(TIERS[i].level,i*10);s.bag=[];s.level=i*10-1;const before=s.stones;assert.equal(buyShopGear(s,'weapon',i),false);assert.equal(s.stones,before);s.level=i*10;assert(buyShopGear(s,'weapon',i));assert(canEquip(s,s.bag[0]));assert(itemStats(s.bag[0]).atk>itemStats({slot:'weapon',tier:i-1,rarity:2}).atk);s.level--;assert.equal(canEquip(s,s.bag[0]),false);}
 for(const tier of [-1,NaN,1.5,999,'1'])assert.equal(buyShopGear(s,'weapon',tier),false);
});
test('merchant counter opens remotely in town but forest cannot spend currency',()=>{
 const w=new World(),p=w.join('merchant',fresh('sword-cockro')),pos=toWorld(MERCHANT_UV,MAPS.town);assert(MERCHANT_UV[0]<.2);
 p.s.stones=10000;p.map='forest';const before=JSON.stringify(p.s);w.command(p,{type:'op',op:'buy'},100);assert.equal(p.opResult.ok,false);assert.equal(JSON.stringify(p.s),before);
 p.map='town';w.command(p,{type:'op',op:'buy'},101);assert.equal(p.opResult.ok,true);assert.equal(p.s.potions,11);
});
test('interpolation smooths visual motion without altering combat position and snaps teleports',()=>{
 const a=receiveActor({x:0,y:0},{x:20,y:10},1000);assert.deepEqual(renderPosition(a,1050),{x:10,y:5});assert.equal(a.x,20);assert.deepEqual(renderPosition(a,1200),{x:20,y:10});const b=receiveActor(a,{x:2000,y:1000},1200);assert.equal(renderPosition(b,1200).x,2000);
});
test('wire cursor avoids repeated effects and does not mutate shared events',()=>{
 const d={type:'state',events:[{id:1},{id:2}]};assert.equal(stateForWire(d,0).events.length,2);assert.equal(stateForWire(d,2).events.length,0);assert.equal(d.events.length,2);assert.equal(stateForWire({...d,events:[...d.events,{id:3}]},2).events[0].id,3);
});
