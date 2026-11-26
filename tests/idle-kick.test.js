import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import WebSocket from 'ws';
import {startServer} from '../server/server.js';
import {PROTOCOL} from '../server/world.js';
test('a hero with no real input is kicked as a bot; touches keep a player online',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cockro-idle-')),app=startServer({port:0,directory,test:true,idleMs:600});await once(app.server,'listening');
 t.after(async()=>{await app.close();rmSync(directory,{recursive:true,force:true});});
 const join2=async name=>{const ws=new WebSocket('ws://127.0.0.1:'+app.server.address().port+'/online/world',{origin:'http://localhost:8080'});await once(ws,'open');const seen=[];ws.on('message',raw=>seen.push(JSON.parse(raw)));ws.send(JSON.stringify({type:'hello',version:PROTOCOL,create:true,name,hero:'sword-cockro'}));return {ws,seen};};
 const bot=await join2('Bot'),human=await join2('Human');
 const keep=setInterval(()=>human.ws.send(JSON.stringify({type:'active'})),150);
 await new Promise(r=>setTimeout(r,1300));clearInterval(keep);
 assert.ok(bot.seen.some(d=>d.type==='kicked'&&d.reason==='idle'));assert.equal(bot.ws.readyState,WebSocket.CLOSED);
 assert.ok(!human.seen.some(d=>d.type==='kicked'));assert.equal(human.ws.readyState,WebSocket.OPEN);human.ws.terminate();
});
