import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import WebSocket from 'ws';
import {startServer} from '../server/server.js';
import {PROTOCOL} from '../server/world.js';
async function until(fn){for(let i=0;i<100;i++){if(fn())return fn();await new Promise(r=>setTimeout(r,20));}throw Error('timed out');}
test('real sockets require authentication, route private chat and preserve connection on errors',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cockro-chat-')),app=startServer({port:0,directory,test:true}),sockets=[];
 t.after(async()=>{for(const ws of sockets)ws.terminate();await app.close();rmSync(directory,{recursive:true,force:true});});await once(app.server,'listening');
 const url=`ws://127.0.0.1:${app.server.address().port}/online/world`;
 async function connect(hello){const ws=new WebSocket(url,{origin:'http://localhost:8080'}),messages=[];sockets.push(ws);ws.on('message',d=>messages.push(JSON.parse(d)));await once(ws,'open');ws.send(JSON.stringify(hello));await until(()=>messages.length);return {ws,messages};}
 const anon=await connect({type:'chat',channel:'world',text:'anonymous'});assert.equal(anon.messages[0].type,'error');
 const hello={type:'hello',version:PROTOCOL,create:true,hero:'sword-cockro'};
 const a=await connect({...hello,name:'Alice'}),b=await connect({...hello,name:'Bob'}),c=await connect({...hello,name:'Charlie'});
 assert.equal(a.messages[0].chatEnabled,true);
 a.ws.send(JSON.stringify({type:'chat',channel:'whisper',to:b.messages[0].id,text:'private',name:'Fake'}));
 const message=await until(()=>b.messages.find(m=>m.type==='chat'));assert.equal(message.name,'Alice');assert.equal(message.text,'private');
 await until(()=>a.messages.find(m=>m.type==='chat'));assert.equal(c.messages.filter(m=>m.type==='chat').length,0);
 a.ws.send(JSON.stringify({type:'chat',channel:'world',text:'spam'}));await until(()=>a.messages.find(m=>m.type==='chatError'));assert.equal(a.ws.readyState,WebSocket.OPEN);
 await new Promise(r=>setTimeout(r,750));a.ws.send(JSON.stringify({type:'chat',channel:'world',text:'everyone'}));await until(()=>c.messages.find(m=>m.type==='chat'&&m.text==='everyone'));
});
