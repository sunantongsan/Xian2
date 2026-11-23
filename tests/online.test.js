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

test('server rejects forged progress, teleport, nonfinite movement and invalid gates',()=>{const w=new World(),p=w.join('a',fresh('sword-cockro'));const old={x:p.x,y:p.y};p.moveAt=100;w.command(p,{type:'move',x:1e8,y:1e8,seq:1},100.1);assert.ok(Math.hypot(p.x-old.x,p.y-old.y)<30);w.command(p,{type:'save',save:{level:210,gold:1e9}});assert.equal(p.s.level,1);assert.equal(p.s.gold,0);w.command(p,{type:'move',x:NaN,y:0,seq:2});assert.ok(Number.isFinite(p.x));assert.equal(w.enter(p,'star',99),false);assert.equal(p.map,'town');});
test('shared monster death rewarded once and respawns consistently',()=>{const w=new World(),a=w.join('a',fresh('sword-cockro')),b=w.join('b',fresh('sword-cockro'));w.enter(a,'forest');w.enter(b,'forest');const m=w.mobs.forest[0];Object.assign(a,{x:m.x,y:m.y});Object.assign(b,{x:m.x,y:m.y});m.hp=1;w.command(a,{type:'attack',target:m.id},100);w.command(b,{type:'attack',target:m.id},100);assert.equal(a.s.kills+b.s.kills,1);assert.equal(w.loot.find(d=>d.kind==='huntGold').count,1.7);assert.equal(b.s.gold,0);assert.equal(w.snapshot(a,100).monsters.find(e=>e.id===m.id).hp,0);assert.equal(w.snapshot(b,100).monsters.find(e=>e.id===m.id).hp,0);w.enter(a,'town');Object.assign(b,{x:m.homeX+900,y:m.homeY});w.tick(.1,110);assert.equal(m.hp,m.def.hp);});
test('potion and skill cooldowns cannot be bypassed by duplicate requests',()=>{const w=new World(),p=w.join('p',fresh('sword-cockro'));p.hp=1;w.command(p,{type:'potion'},100);w.command(p,{type:'potion'},100);assert.equal(p.s.potions,9);w.enter(p,'forest');p.mp=80;w.command(p,{type:'skill',slot:0},200);const mp=p.mp;w.command(p,{type:'skill',slot:0},200);assert.equal(p.mp,mp);});
function client(url,hello){return new Promise((resolve,reject)=>{const ws=new WebSocket(url,{origin:'http://localhost:8080'}),messages=[];ws.on('error',reject);ws.on('open',()=>ws.send(JSON.stringify(hello)));ws.on('message',raw=>{const m=JSON.parse(raw);messages.push(m);if(m.type==='welcome')resolve({ws,messages,welcome:m});});});}
async function until(fn){for(let i=0;i<60;i++){const v=fn();if(v)return v;await new Promise(ok=>setTimeout(ok,50));}throw Error('timed out');}
test('two real sockets isolate movement, reject duplicate identity, persist and resume',async t=>{const directory=mkdtempSync(join(tmpdir(),'cockro-online-')),app=startServer({port:0,directory,test:true});await once(app.server,'listening');t.after(()=>app.close());const url=`ws://127.0.0.1:${app.server.address().port}/online/world`,hello={type:'hello',version:PROTOCOL,create:true,name:'Tester',hero:'sword-cockro'};const a=await client(url,hello),b=await client(url,hello);t.after(()=>{a.ws.terminate();b.ws.terminate();});await until(()=>a.messages.some(m=>m.type==='state'&&m.online===2&&m.players.length===0));
 const p=app.world.players.get(a.welcome.id),x=p.x;await new Promise(ok=>setTimeout(ok,150));a.ws.send(JSON.stringify({type:'move',x:p.x+20,y:p.y,seq:1}));await until(()=>a.messages.some(m=>m.type==='state'&&m.self.x>x+1));assert(b.messages.filter(m=>m.type==='state').every(m=>m.players.length===0));
 p.s.gold=5;Object.assign(p,shopWorld(MERCHANT_UV,SHOP_MAPS.town));a.ws.send(JSON.stringify({type:'op',op:'buy'}));await until(()=>p.s.potions===11);assert.equal(JSON.parse(readFileSync(join(directory,p.id+'.json'))).potions,11);
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
 a.ws.send(JSON.stringify({type:'testAdTicket',item:'protectionTicket'}));
 if(!enabled){await until(()=>a.messages.find(m=>m.type==='adError'&&m.message==='test_rewards_disabled'));assert.equal(app.world.players.get(a.welcome.id).s.protectionTickets,0);continue;}
 const ticket=await until(()=>a.messages.find(m=>m.type==='adTicket'));assert.equal(ticket.test,true);
 a.ws.send(JSON.stringify({type:'testAdComplete',nonce:ticket.nonce}));
 await until(()=>a.messages.find(m=>m.type==='adReward'));
 const first=a.messages.findIndex(m=>m.type==='adReward');assert.equal(a.messages[first-1].self.save.protectionTickets,1);
 assert.equal(JSON.parse(readFileSync(join(directory,a.welcome.id+'.json'))).protectionTickets,1);
 a.ws.send(JSON.stringify({type:'testAdComplete',nonce:ticket.nonce}));await until(()=>a.messages.find(m=>m.type==='adReward'&&m.duplicate));
 a.ws.close();await until(()=>!app.world.players.has(a.welcome.id));
 const b=await client(url,{type:'hello',version:PROTOCOL,token:a.welcome.token});t.after(()=>b.ws.terminate());assert.equal(b.welcome.save.protectionTickets,1);
 }
});





test('old class-change requests cannot refund points or switch heroes across reconnect',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cockro-same-hero-')),app=startServer({port:0,directory,test:true});await once(app.server,'listening');t.after(()=>app.close());
 const url=`ws://127.0.0.1:${app.server.address().port}/online/world`,a=await client(url,{type:'hello',version:PROTOCOL,create:true,name:'Mutator',hero:'sword-cockro'});t.after(()=>a.ws.terminate());
 const p=app.world.players.get(a.welcome.id);Object.assign(p.s,{level:20,xp:17,statPoints:46,attributes:{str:12,vit:8,int:4,agi:6}});
 a.ws.send(JSON.stringify({type:'op',op:'mutate'}));await until(()=>a.messages.some(m=>m.type==='opResult'&&!m.ok&&m.op==='mutate'));
 a.ws.close();await until(()=>!app.world.players.has(p.id));const b=await client(url,{type:'hello',version:PROTOCOL,token:a.welcome.token});t.after(()=>b.ws.terminate());
 assert.equal(b.welcome.save.hero,'sword-cockro');assert.equal(b.welcome.save.statPoints,46);assert.equal(b.welcome.save.xp,17);assert.equal(b.welcome.save.attributes.str,12);
});

test('retired suit equip is rejected over websocket and cannot survive reconnect',async t=>{
 const {makeItem}=await import('../web/gear.js');
 const directory=mkdtempSync(join(tmpdir(),'cockro-suit-online-')),app=startServer({port:0,directory,test:true});await once(app.server,'listening');t.after(()=>app.close());
 const url=`ws://127.0.0.1:${app.server.address().port}/online/world`;
 const a=await client(url,{type:'hello',version:PROTOCOL,create:true,name:'SuitTester',hero:'sword-cockro'});t.after(()=>a.ws.terminate());
 const p=app.world.players.get(a.welcome.id),it={...makeItem('armor',0,2),insect:'scorpion-female'};p.s.bag.push(it);
 a.ws.send(JSON.stringify({type:'op',op:'equip',id:it.id}));await until(()=>a.messages.some(m=>m.type==='opResult'&&m.op==='equip'));
 assert.equal(p.s.equip.armor,undefined);a.ws.close();await until(()=>!app.world.players.has(p.id));
 const again=await client(url,{type:'hello',version:PROTOCOL,token:a.welcome.token});t.after(()=>again.ws.terminate());
 assert.equal(again.welcome.save.equip.armor,undefined);assert(!again.welcome.save.bag.some(it=>it.slot==='armor'));
});


test('hunter statistics count offline and reconnected accounts and redemption persists once',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cockro-bounty-'));
 const app=startServer({port:0,directory,test:true});await once(app.server,'listening');t.after(()=>app.close());
 const url='ws://127.0.0.1:'+app.server.address().port+'/online/world';
 const hello={type:'hello',version:PROTOCOL,create:true,hero:'sword-cockro'};
 const rich=await client(url,{...hello,name:'RichHunter'}),hunter=await client(url,{...hello,name:'NewHunter'});
 t.after(()=>hunter.ws.terminate());
 const richState=app.world.players.get(rich.welcome.id).s;richState.stones=12345;
 rich.ws.close();await until(()=>!app.world.players.has(rich.welcome.id));
 const s=app.world.players.get(hunter.welcome.id).s,balance=s.stones;s.gold=45;
 hunter.ws.send(JSON.stringify({type:'hunterStats'}));
 const first=await until(()=>hunter.messages.find(m=>m.type==='hunterStats'));
 assert.equal(first.accounts,2);assert.equal(first.online,1);assert.equal(first.heads,45);
 assert.deepEqual(first.leader,{name:'RichHunter',coins:12345});
 const exchange={type:'op',op:'exchangeBounty',rate:2,coins:2,revision:0};
 hunter.ws.send(JSON.stringify(exchange));await until(()=>hunter.messages.some(m=>m.op==='exchangeBounty'&&m.ok));
 const saved=JSON.parse(readFileSync(join(directory,hunter.welcome.id+'.json')));
 assert.equal(saved.gold,41);assert.equal(saved.stones,balance+2);
 hunter.ws.close();await until(()=>!app.world.players.has(hunter.welcome.id));
 const again=await client(url,{type:'hello',version:PROTOCOL,token:hunter.welcome.token});t.after(()=>again.ws.terminate());
 assert.equal(again.welcome.save.gold,41);assert.equal(again.welcome.save.bountyRevision,1);
 app.world.players.get(hunter.welcome.id).s.gold+=4;
 again.ws.send(JSON.stringify(exchange));await until(()=>again.messages.some(m=>m.op==='exchangeBounty'&&!m.ok));
 const refreshed=await until(()=>again.messages.find(m=>m.type==='hunterStats'));
 assert.equal(refreshed.accounts,2);assert.equal(refreshed.coins,balance+2);assert.equal(refreshed.heads,45);
});
