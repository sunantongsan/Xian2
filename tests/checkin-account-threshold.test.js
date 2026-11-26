import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import WebSocket from 'ws';
import {startServer} from '../server/server.js';
import {PROTOCOL} from '../server/world.js';
import {checkinPanelHTML} from '../web/gift-center.js';
const hash=s=>createHash('sha256').update(s).digest('hex');

test('101st distinct account halves check-in for an already connected player and survives restart',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cockro-checkin-'));
 const profiles=join(directory,'accounts');mkdirSync(profiles);
 for(let i=0;i<99;i++)writeFileSync(join(profiles,'profile-'+hash('profile'+i)+'.json'),'{}');
 const start=async()=>{const app=startServer({directory,port:0,test:true});await once(app.server,'listening');return app;};
 let app=await start();const sockets=[];
 t.after(async()=>{for(const ws of sockets)ws.terminate();await app.close();rmSync(directory,{recursive:true,force:true});});
 const signup=async name=>{
  const ws=new WebSocket('ws://127.0.0.1:'+app.server.address().port+'/online/world',{origin:'http://localhost:8080'});
  sockets.push(ws);await once(ws,'open');
  ws.send(JSON.stringify({type:'hello',version:PROTOCOL,create:true,name,hero:'sword-cockro'}));
  const [packet]=await once(ws,'message');return JSON.parse(packet);
 };
 const hundred=await signup('First');assert.equal(hundred.checkinDivisor,1);
 const next=await signup('Second');assert.equal(next.checkinDivisor,2);
 const p=app.world.getActor(hundred.id),state=app.world.snapshot(p);
 assert.equal(state.economy.checkinDivisor,2);
 assert.match(checkinPanelHTML(p.s,Date.now(),false,state.economy.checkinDivisor),/3,000 COCKRO/);
 const before=p.s.stones;app.world.command(p,{type:'op',op:'dailyCheckin',checkinDivisor:2});
 assert.equal(p.s.stones-before,1000);
 for(const ws of sockets)ws.close();await app.close();app=await start();
 const health=await fetch('http://127.0.0.1:'+app.server.address().port+'/online/health');
 assert.equal((await health.json()).checkinDivisor,2);
});
