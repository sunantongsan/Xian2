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
test('private maps isolate monsters and discard the session on exit while preserving progress',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cockro-solo-'));
 let app=startServer({port:0,directory,test:true});
 await once(app.server,'listening');t.after(()=>app.close());
 const a=await connect(app,null,'Hunter A'),b=await connect(app,null,'Hunter B');
 const pa=app.world.getActor(a.welcome.id),pb=app.world.getActor(b.welcome.id);
 const wa=app.world.sessions.get(pa.id),wb=app.world.sessions.get(pb.id);
 wa.enter(pa,'forest');wb.enter(pb,'forest');
 const first=wa.mobs.forest[0],other=wb.mobs.forest[0];
 wa.hit(pa,first,first.hp+1,Date.now()/1000);
 assert.equal(other.hp,other.def.hp);assert.equal(pa.s.bountyHeads,1);assert.equal(pb.s.bountyHeads,0);
 assert.deepEqual(app.world.snapshot(pa).players,[]);
 const position=[pa.x,pa.y],token=a.welcome.token;
 a.ws.close();await until(()=>!app.world.getActor(pa.id));
 assert.equal(app.world.sessions.size,1);
 b.ws.close();await until(()=>app.world.sessions.size===0);
 await app.close();app=startServer({port:0,directory,test:true});await once(app.server,'listening');
 assert.equal(app.world.sessions.size,0);
 const resumed=await connect(app,token);t.after(()=>resumed.ws.terminate());
 assert.equal(resumed.welcome.save.bountyHeads,1);
 assert.equal(resumed.state.self.map,'forest');
 assert.deepEqual([resumed.state.self.x,resumed.state.self.y],position);
});
