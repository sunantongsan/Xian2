import {MERCHANT_UV} from '../web/merchant.js';import {MAPS as SHOP_MAPS,toWorld as shopWorld} from '../web/maps.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import WebSocket from 'ws';
import {World,PROTOCOL} from '../server/world.js';
import {startServer} from '../server/server.js';
import {fresh,xpNeed} from '../web/core.js';

test('server rejects forged progress, teleport, nonfinite movement and invalid gates',()=>{const w=new World(),p=w.join('a',fresh('sword-cockro'));const old={x:p.x,y:p.y};p.moveAt=100;w.command(p,{type:'move',x:1e8,y:1e8,seq:1},100.1);assert.ok(Math.hypot(p.x-old.x,p.y-old.y)<30);w.command(p,{type:'save',save:{level:210,gold:1e9}});assert.equal(p.s.level,1);assert.equal(p.s.gold,100000);w.command(p,{type:'move',x:NaN,y:0,seq:2});assert.ok(Number.isFinite(p.x));assert.equal(w.enter(p,'star',99),false);assert.equal(p.map,'town');});
test('shared monster death rewarded once and respawns consistently',()=>{const w=new World(),a=w.join('a',fresh('sword-cockro')),b=w.join('b',fresh('sword-cockro'));w.enter(a,'forest');w.enter(b,'forest');const m=w.mobs.forest[0];Object.assign(a,{x:m.x,y:m.y});Object.assign(b,{x:m.x,y:m.y});m.hp=1;w.command(a,{type:'attack',target:m.id},100);w.command(b,{type:'attack',target:m.id},100);assert.equal(a.s.kills+b.s.kills,1);assert.equal(w.snapshot(a,100).monsters.find(e=>e.id===m.id).hp,0);assert.equal(w.snapshot(b,100).monsters.find(e=>e.id===m.id).hp,0);w.enter(a,'town');w.enter(b,'town');w.tick(.1,110);assert.equal(m.hp,m.def.hp);});
test('potion and skill cooldowns cannot be bypassed by duplicate requests',()=>{const w=new World(),p=w.join('p',fresh('sword-cockro'));p.hp=1;w.command(p,{type:'potion'},100);w.command(p,{type:'potion'},100);assert.equal(p.s.potions,9);w.enter(p,'forest');p.mp=80;w.command(p,{type:'skill',slot:0},200);const mp=p.mp;w.command(p,{type:'skill',slot:0},200);assert.equal(p.mp,mp);});
function client(url,hello){return new Promise((resolve,reject)=>{const ws=new WebSocket(url,{origin:'http://localhost:8080'}),messages=[];ws.on('error',reject);ws.on('open',()=>ws.send(JSON.stringify(hello)));ws.on('message',raw=>{const m=JSON.parse(raw);messages.push(m);if(m.type==='welcome')resolve({ws,messages,welcome:m});});});}
async function until(fn){for(let i=0;i<60;i++){const v=fn();if(v)return v;await new Promise(ok=>setTimeout(ok,50));}throw Error('timed out');}
test('two real sockets see movement, reject duplicate identity, persist and resume',async t=>{const directory=mkdtempSync(join(tmpdir(),'cockro-online-')),app=startServer({port:0,directory,test:true});await once(app.server,'listening');t.after(()=>app.close());const url=`ws://127.0.0.1:${app.server.address().port}/online/world`,hello={type:'hello',version:PROTOCOL,create:true,name:'Tester',hero:'sword-cockro'};const a=await client(url,hello),b=await client(url,hello);t.after(()=>{a.ws.terminate();b.ws.terminate();});await until(()=>a.messages.some(m=>m.type==='state'&&m.players.some(p=>p.id===b.welcome.id)));
 const p=app.world.players.get(a.welcome.id),x=p.x;await new Promise(ok=>setTimeout(ok,150));a.ws.send(JSON.stringify({type:'move',x:p.x+20,y:p.y,seq:1}));await until(()=>b.messages.some(m=>m.type==='state'&&m.players.some(q=>q.id===p.id&&q.x>x+1)));
 Object.assign(p,shopWorld(MERCHANT_UV,SHOP_MAPS.town));a.ws.send(JSON.stringify({type:'op',op:'buy'}));await until(()=>p.s.potions===11);assert.equal(JSON.parse(readFileSync(join(directory,p.id+'.json'))).potions,11);
 const duplicate=new WebSocket(url,{origin:'http://localhost:8080'});duplicate.on('open',()=>duplicate.send(JSON.stringify({type:'hello',version:PROTOCOL,token:a.welcome.token})));const [raw]=await once(duplicate,'message');assert.equal(JSON.parse(raw).message,'already_online');duplicate.terminate();a.ws.close();await until(()=>!app.world.players.has(p.id));const again=await client(url,{type:'hello',version:PROTOCOL,token:a.welcome.token});assert.equal(again.welcome.save.potions,11);again.ws.close();
});
test('unapproved browser origins are rejected before websocket upgrade',async t=>{const app=startServer({port:0,directory:mkdtempSync(join(tmpdir(),'cockro-origin-')),test:true});await once(app.server,'listening');t.after(()=>app.close());const ws=new WebSocket(`ws://127.0.0.1:${app.server.address().port}/online/world`,{origin:'https://untrusted.example'});const [err]=await once(ws,'error');assert.match(err.message,/403/);});


test('old online saves migrate once before welcome and persist both balances',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cockro-migrate-')),app=startServer({port:0,directory,test:true});await once(app.server,'listening');t.after(()=>app.close());
 const url=`ws://127.0.0.1:${app.server.address().port}/online/world`;
 const a=await client(url,{type:'hello',version:PROTOCOL,create:true,name:'Tester',hero:'sword-cockro'}),id=a.welcome.id,token=a.welcome.token;
 a.ws.close();await until(()=>!app.world.players.has(id));
 const path=join(directory,id+'.json'),old=JSON.parse(readFileSync(path));delete old.mutationVersion;delete old.mutationStage;delete old.balanceVersion;delete old.mpPotions;old.level=20;old.xp=822;old.gold=1234;old.stones=7;writeFileSync(path,JSON.stringify(old));
 const b=await client(url,{type:'hello',version:PROTOCOL,token});t.after(()=>b.ws.terminate());
 assert.equal(b.welcome.save.gold,1234);assert.equal(b.welcome.save.stones,7);assert.equal(b.welcome.save.mpPotions,5);assert.equal(b.welcome.save.xp,Math.floor(822/1645*xpNeed(20)));
 const saved=JSON.parse(readFileSync(path));assert.equal(saved.balanceVersion,3);assert.equal(saved.mpPotions,5);
 b.ws.close();await until(()=>!app.world.players.has(id));const c=await client(url,{type:'hello',version:PROTOCOL,token});t.after(()=>c.ws.terminate());assert.equal(c.welcome.save.xp,saved.xp);assert.equal(c.welcome.save.gold,1234);assert.equal(c.welcome.save.stones,7);
});

test('v2 online saves preserve half-full XP across reconnect and persist v3 once',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cockro-migrate-')),app=startServer({port:0,directory,test:true});await once(app.server,'listening');t.after(()=>app.close());
 const url=`ws://127.0.0.1:${app.server.address().port}/online/world`;
 const a=await client(url,{type:'hello',version:PROTOCOL,create:true,name:'Tester',hero:'sword-cockro'}),id=a.welcome.id,token=a.welcome.token;
 a.ws.close();await until(()=>!app.world.players.has(id));
 const path=join(directory,id+'.json'),old=JSON.parse(readFileSync(path));delete old.mutationVersion;delete old.mutationStage;old.balanceVersion=2;delete old.mpPotions;old.level=20;old.xp=3060;old.gold=1234;old.stones=7;writeFileSync(path,JSON.stringify(old));
 const b=await client(url,{type:'hello',version:PROTOCOL,token});t.after(()=>b.ws.terminate());
 assert.equal(b.welcome.save.gold,1234);assert.equal(b.welcome.save.stones,7);assert.equal(b.welcome.save.mpPotions,5);assert.equal(b.welcome.save.xp,3978);
 const saved=JSON.parse(readFileSync(path));assert.equal(saved.balanceVersion,3);assert.equal(saved.mpPotions,5);
 b.ws.close();await until(()=>!app.world.players.has(id));const c=await client(url,{type:'hello',version:PROTOCOL,token});t.after(()=>c.ws.terminate());assert.equal(c.welcome.save.xp,saved.xp);assert.equal(c.welcome.save.gold,1234);assert.equal(c.welcome.save.stones,7);
});


test('internal demo ticket persists once, replies after snapshot, and is disabled by default',async t=>{
 for(const enabled of [false,true]){
 const directory=mkdtempSync(join(tmpdir(),'cockro-demo-')),app=startServer({port:0,directory,test:true,testRewards:enabled});await once(app.server,'listening');t.after(()=>app.close());
 const url=`ws://127.0.0.1:${app.server.address().port}/online/world`,a=await client(url,{type:'hello',version:PROTOCOL,create:true,name:'Tester',hero:'sword-cockro'});t.after(()=>a.ws.terminate());
 a.ws.send(JSON.stringify({type:'testAdTicket',item:'ruby'}));
 if(!enabled){await until(()=>a.messages.find(m=>m.type==='adError'&&m.message==='test_rewards_disabled'));assert.equal(app.world.players.get(a.welcome.id).s.upgradeItems.ruby,0);continue;}
 const ticket=await until(()=>a.messages.find(m=>m.type==='adTicket'));assert.equal(ticket.test,true);
 a.ws.send(JSON.stringify({type:'testAdComplete',nonce:ticket.nonce}));
 await until(()=>a.messages.find(m=>m.type==='adReward'));
 const first=a.messages.findIndex(m=>m.type==='adReward');assert.equal(a.messages[first-1].self.save.upgradeItems.ruby,1);
 assert.equal(JSON.parse(readFileSync(join(directory,a.welcome.id+'.json'))).upgradeItems.ruby,1);
 a.ws.send(JSON.stringify({type:'testAdComplete',nonce:ticket.nonce}));await until(()=>a.messages.find(m=>m.type==='adReward'&&m.duplicate));
 a.ws.close();await until(()=>!app.world.players.has(a.welcome.id));
 const b=await client(url,{type:'hello',version:PROTOCOL,token:a.welcome.token});t.after(()=>b.ws.terminate());assert.equal(b.welcome.save.upgradeItems.ruby,1);
 }
});





test('doctor socket operation persists refunded points and mutation across reconnect without duplicate refunds',async t=>{
 const {DOCTOR_UV}=await import('../web/mutation.js');
 const directory=mkdtempSync(join(tmpdir(),'cockro-mutation-')),app=startServer({port:0,directory,test:true});await once(app.server,'listening');t.after(()=>app.close());
 const url=`ws://127.0.0.1:${app.server.address().port}/online/world`,a=await client(url,{type:'hello',version:PROTOCOL,create:true,name:'Mutator',hero:'sword-cockro'});t.after(()=>a.ws.terminate());
 const p=app.world.players.get(a.welcome.id);Object.assign(p.s,{level:20,xp:0,statPoints:46,attributes:{str:12,vit:8,int:4,agi:6}});Object.assign(p,shopWorld(DOCTOR_UV,SHOP_MAPS.town));
 a.ws.send(JSON.stringify({type:'op',op:'mutate'}));await until(()=>a.messages.some(m=>m.type==='state'&&m.self.save.mutationStage===1));
 const saved=JSON.parse(readFileSync(join(directory,p.id+'.json')));assert.equal(saved.statPoints,76);assert.equal(saved.xp,0);assert.deepEqual(saved.attributes,{str:0,vit:0,int:0,agi:0});
 a.ws.send(JSON.stringify({type:'op',op:'mutate'}));await new Promise(r=>setTimeout(r,100));assert.equal(p.s.statPoints,76);
 a.ws.close();await until(()=>!app.world.players.has(p.id));const b=await client(url,{type:'hello',version:PROTOCOL,token:a.welcome.token});t.after(()=>b.ws.terminate());assert.equal(b.welcome.save.mutationStage,1);assert.equal(b.welcome.save.statPoints,76);assert.equal(b.welcome.save.xp,0);
});
