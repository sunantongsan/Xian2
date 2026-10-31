import {MERCHANT_UV} from '../web/merchant.js';import {MAPS as SHOP_MAPS,toWorld as shopWorld} from '../web/maps.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import WebSocket from 'ws';
import {startServer} from '../server/server.js';
import {PROTOCOL} from '../server/world.js';
const hello={type:'hello',version:PROTOCOL,create:true,name:'Tester',hero:'sword-cricket'};
async function setup(t,maxPlayers=64){const directory=mkdtempSync(join(tmpdir(),'cockro-roster-'));const app=startServer({port:0,directory,test:true,maxPlayers});await once(app.server,'listening');t.after(async()=>{await app.close();rmSync(directory,{recursive:true,force:true});});return {...app,directory,url:`ws://127.0.0.1:${app.server.address().port}/online/world`};}
async function client(url,message){const ws=new WebSocket(url,{origin:'http://localhost:8080'});ws.on('open',()=>ws.send(JSON.stringify(message)));const [raw]=await once(ws,'message');return {ws,data:JSON.parse(raw)};}
async function until(fn){for(let i=0;i<60;i++){if(fn())return;await new Promise(r=>setTimeout(r,30));}throw Error('timed out');}
test('64 live sockets share a world and bounded nearby views; capacity remains enforced',async t=>{
 const app=await setup(t),clients=[];t.after(()=>clients.forEach(c=>c.ws.terminate()));
 for(let i=0;i<64;i++){const c=await client(app.url,hello);assert.equal(c.data.type,'welcome');clients.push(c);}
 assert.equal(app.world.players.size,64);
 for(const p of app.world.players.values())assert.equal(app.world.snapshot(p).players.length,32);
 const extra=await client(app.url,hello);assert.equal(extra.data.message,'room_full');extra.ws.terminate();
 const response=await fetch(`http://127.0.0.1:${app.server.address().port}/online/health`);assert.equal((await response.json()).capacity,64);
});
test('authenticated character preview does not enter world or overwrite saved progress',async t=>{
 const app=await setup(t),a=await client(app.url,hello);a.ws.close();await until(()=>app.world.players.size===0);
 const path=join(app.directory,a.data.id+'.json'),before=readFileSync(path,'utf8');
 const preview=await client(app.url,{type:'hello',version:PROTOCOL,token:a.data.token,preview:true});
 assert.deepEqual(preview.data,{type:'roster',characters:[{id:'main',hero:'sword-cricket',name:'Tester',level:1}]});preview.ws.terminate();
 assert.equal(app.world.players.size,0);assert.equal(readFileSync(path,'utf8'),before);
 const bad=await client(app.url,{...hello,preview:true});assert.equal(bad.data.type,'error');bad.ws.terminate();assert.equal(app.world.players.size,0);
});
test('ordinary progress batches disk writes but purchases persist and reply immediately',async t=>{
 const app=await setup(t),a=await client(app.url,hello);t.after(()=>a.ws.terminate());
 const p=app.world.players.get(a.data.id),path=join(app.directory,a.data.id+'.json');
 p.s.gold=1000;p.dirty=true;
 await new Promise(r=>setTimeout(r,250));assert.notEqual(JSON.parse(readFileSync(path,'utf8')).gold,1000);
 p.lastSaved=Date.now()-5001;
 await until(()=>JSON.parse(readFileSync(path,'utf8')).gold===1000);
 Object.assign(p,shopWorld(MERCHANT_UV,SHOP_MAPS.town));const before=p.s.potions;let ack,seen;
 a.ws.on('message',raw=>{const d=JSON.parse(raw);if(d.type==='state')seen=d;if(d.type==='opResult')ack=d;});
 a.ws.send(JSON.stringify({type:'op',op:'buy'}));await until(()=>ack);
 assert.equal(seen.self.save.potions,before+1);
 const disk=JSON.parse(readFileSync(path,'utf8'));assert.equal(disk.potions,before+1);assert.equal(disk.gold,950);
});


