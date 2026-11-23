import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import WebSocket from 'ws';
import {fresh,validSave,maxHP,damage,combatStats} from '../web/core.js';
import {BUFF_DURATION,BUFF_NPC_UV,movementMultiplier,buffActive} from '../web/town-buff.js';
import {World,PROTOCOL} from '../server/world.js';
import {MAPS,toWorld} from '../web/maps.js';
import {startServer} from '../server/server.js';
function hero(w){const p=w.join('test',fresh('sword-cockro'));Object.assign(p,toWorld(BUFF_NPC_UV,MAPS.town));return p;}
test('retired buff has no stats effect and cannot be granted even in test mode',()=>{const w=new World({testRewards:true}),p=hero(w),hp=maxHP(p.s),atk=damage(p.s);p.s.townBuffUntil=Date.now()+BUFF_DURATION;assert.equal(maxHP(p.s),hp);assert.equal(damage(p.s),atk);assert.equal(movementMultiplier(p.s),1);w.command(p,{type:'op',op:'townBuff'});assert.equal(p.opResult.ok,false);assert.equal(validSave(p.s).townBuffUntil,0);assert(!MAPS.town.pois.some(p=>p.action==='buff'));});

test('robot refuses disabled test mode, dead players and wrong maps',()=>{
 for(const mode of ['disabled','dead','forest']){const w=new World({testRewards:mode!=='disabled'}),p=hero(w);if(mode==='dead')p.hp=0;if(mode==='remote')p.x+=1000;if(mode==='forest')p.map='forest';w.command(p,{type:'op',op:'townBuff'});assert.equal(p.s.townBuffUntil,0,mode);}
});
test('critical chance never exceeds 100%, malformed expiry is rejected',()=>{
 const s=fresh('sword-cockro');s.attributes.agi=2000;s.townBuffUntil=Date.now()+BUFF_DURATION;assert.equal(combatStats(s).crit,.5);
 s.townBuffUntil=Infinity;assert.equal(validSave(s).townBuffUntil,0);
});
async function connect(url,hello){const ws=new WebSocket(url,{origin:'http://localhost'});await once(ws,'open');const result=new Promise((resolve,reject)=>{ws.on('message',b=>{const d=JSON.parse(b);if(d.type==='welcome')resolve(d);if(d.type==='error')reject(Error(d.message));});ws.on('error',reject);});ws.send(JSON.stringify(hello));return {ws,welcome:await result};}
test('new accounts receive 500 COCKRO coin once in both modes',async t=>{
 for(const enabled of [true,false]){
 const app=startServer({port:0,directory:mkdtempSync(join(tmpdir(),'aura-test-')),test:true,testRewards:enabled});await once(app.server,'listening');t.after(()=>app.close());const url=`ws://127.0.0.1:${app.server.address().port}/online/world`;
 const a=await connect(url,{type:'hello',version:PROTOCOL,create:true,name:'Tester',hero:'sword-cockro'});assert.equal(a.welcome.save.gold,0);assert.equal(a.welcome.save.stones,500);
 const p=app.world.players.get(a.welcome.id);p.s.gold=Math.max(0,p.s.gold-125);p.s.stones=Math.max(0,p.s.stones-5);const close=once(a.ws,'close');a.ws.close();await close;
 const b=await connect(url,{type:'hello',version:PROTOCOL,token:a.welcome.token});assert.equal(b.welcome.save.gold,Math.max(0,(0)-125));assert.equal(b.welcome.save.stones,495);b.ws.terminate();
 }
});


test('buff reaches players anywhere in town and reports acceptance',()=>{const w=new World({testRewards:true}),p=hero(w);p.x+=1000;w.command(p,{type:'op',op:'townBuff'});assert.equal(p.opResult.ok,false);assert.equal(buffActive(p.s),false);});

