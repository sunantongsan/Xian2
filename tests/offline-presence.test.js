import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import WebSocket from 'ws';
import {startServer} from '../server/server.js';
import {PROTOCOL} from '../server/world.js';
const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,20));}throw Error('state timeout');};
async function connect(app,token,name='Presence Tester'){
 const ws=new WebSocket(`ws://127.0.0.1:${app.server.address().port}/online/world`,{origin:'http://localhost:8080'}),c={ws};ws.on('message',raw=>{const d=JSON.parse(raw);if(d.type==='welcome')c.welcome=d;if(d.type==='state')c.state=d;if(d.type==='error')c.error=d.message;});await once(ws,'open');ws.send(JSON.stringify({type:'hello',version:PROTOCOL,create:!token,token,name,hero:'sword-cockro'}));await until(()=>c.state||c.error);assert(!c.error,c.error);return c;
}
test('real sockets keep offline body, persist defeat and potions through server restart and reconnect',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cockro-presence-'));let app=startServer({port:0,directory,test:true});await once(app.server,'listening');t.after(()=>app.close());
 const a=await connect(app,null,'Online Attacker'),b=await connect(app,null,'Offline Defender');const token=b.welcome.token,id=b.welcome.id;
 const pa=app.world.players.get(a.welcome.id),pb=app.world.players.get(id);app.world.enter(pa,'forest');app.world.enter(pb,'forest');app.world.mobs.forest=[];
 pb.x=pa.x+40;pb.y=pa.y;pb.hp=35;pb.mp=0;const pos={x:pb.x,y:pb.y},pots=pb.s.potions;
 b.ws.close();await until(()=>app.world.sleepers.has(id));await until(()=>a.state.players.some(p=>p.id===id&&p.offline));
 a.ws.send(JSON.stringify({type:'attackPlayer',target:id}));await until(()=>pb.s.potions===pots-1);assert.equal(pb.s.mpPotions,4);
 // Fixture puts defender at final-hit HP; damage still enters through authenticated command.
 pb.s.potions=0;pb.hp=1;await new Promise(r=>setTimeout(r,550));a.ws.send(JSON.stringify({type:'attackPlayer',target:id}));await until(()=>pb.hp===0);await until(()=>JSON.parse(readFileSync(join(directory,id+'.json'))).worldState.hp===0);
 const reports=pb.s.pvpReports;assert.equal(reports.at(-1).opponent,'Online Attacker');assert.equal(reports.at(-1).result,'lost');assert.equal(reports.at(-1).potions,1);
 await app.close();app=startServer({port:0,directory,test:true});await once(app.server,'listening');assert.equal(app.world.sleepers.get(id).hp,0);
 const back=await connect(app,token);t.after(()=>back.ws.terminate());assert.equal(back.state.self.hp,0);assert.equal(back.state.self.map,'forest');assert.deepEqual({x:back.state.self.x,y:back.state.self.y},pos);assert.equal(back.welcome.save.pvpReports.at(-1).result,'lost');assert.equal(back.welcome.save.mpPotions,4);assert.equal(app.world.sleepers.has(id),false);
 back.ws.send(JSON.stringify({type:'op',op:'readPvpReports'}));await until(()=>back.state.self.save.pvpReports.every(r=>!r.unread));
});
