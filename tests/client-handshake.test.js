import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import WebSocket from 'ws';
import {OnlineClient} from '../web/online.js';
import {startServer} from '../server/server.js';

test('actual game client enters current server, receives world, and reconnects to saved character',async t=>{
 const app=startServer({port:0,directory:mkdtempSync(join(tmpdir(),'cockro-client-handshake-')),test:true});await once(app.server,'listening');t.after(()=>app.close());
 const OriginalSocket=globalThis.WebSocket,OriginalStorage=globalThis.localStorage,storage=new Map();
 globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))};
 globalThis.WebSocket=class extends WebSocket{constructor(){super(`ws://127.0.0.1:${app.server.address().port}/online/world`,{origin:'http://localhost:8080'});}};
 t.after(()=>{globalThis.WebSocket=OriginalSocket;if(OriginalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=OriginalStorage;});
 let state;const client=new OnlineClient(d=>state=d,()=>{});t.after(()=>client.disconnect());
 const save=await client.connect('sword-cockro','main',false,'Handshake Tester');assert.equal(save.name,'Handshake Tester');assert(client.ready);assert(state?.self.map==='town');assert(storage.has('cockro-online-device-token-v1'));
 const token=storage.get('cockro-online-device-token-v1');const closed=once(client.socket,'close');client.disconnect();await closed;
 for(let i=0;i<30&&app.world.players.size;i++)await new Promise(r=>setTimeout(r,10));
 const restored=await client.connect('sword-cockro');assert.equal(restored.name,save.name);assert.equal(storage.get('cockro-online-device-token-v1'),token);assert(client.ready);assert.equal(state.self.map,'town');
});

test('server still rejects an incompatible wire protocol before granting a game session',async t=>{
 const app=startServer({port:0,directory:mkdtempSync(join(tmpdir(),'cockro-bad-protocol-')),test:true});await once(app.server,'listening');t.after(()=>app.close());
 const ws=new WebSocket(`ws://127.0.0.1:${app.server.address().port}/online/world`,{origin:'http://localhost:8080'});t.after(()=>ws.terminate());await once(ws,'open');const message=once(ws,'message');ws.send(JSON.stringify({type:'hello',version:'unsupported-protocol',create:true,hero:'sword-cockro',name:'Wrong Protocol'}));const [raw]=await message;assert.equal(JSON.parse(raw).type,'error');assert.equal(JSON.parse(raw).message,'invalid_request');assert.equal(app.world.players.size,0);
});
