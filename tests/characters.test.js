import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import WebSocket from 'ws';
import {startServer} from '../server/server.js';
import {PROTOCOL} from '../server/world.js';
const hello={type:'hello',version:PROTOCOL};
async function client(url,data){const ws=new WebSocket(url,{origin:'http://localhost:8080'});ws.on('open',()=>ws.send(JSON.stringify({...hello,...data})));const [raw]=await once(ws,'message');return {ws,data:JSON.parse(raw)};}
async function close(c,app){c.ws.close();for(let n=0;n<100&&app.world.players.size;n++)await new Promise(r=>setTimeout(r,10));assert.equal(app.world.players.size,0);}
test('one cockroach per account, extra slots and other species rejected; progress persists',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cockro-one-'));const app=startServer({port:0,directory,test:true,testRewards:true});await once(app.server,'listening');t.after(async()=>{await app.close();rmSync(directory,{recursive:true,force:true});});const url=`ws://127.0.0.1:${app.server.address().port}/online/world`;
 const invalid=await client(url,{create:true,name:'Tester',hero:'sword-cricket'});assert.equal(invalid.data.type,'error');invalid.ws.terminate();
 const main=await client(url,{create:true,name:'Tester',hero:'sword-cockro'});t.after(()=>main.ws.terminate());assert.equal(main.data.character,'main');assert.equal(main.data.save.stones,1000000);await close(main,app);
 const token=main.data.token,path=join(directory,main.data.id+'.json'),old=JSON.parse(readFileSync(path));Object.assign(old,{level:37,gold:123456,stones:41234});writeFileSync(path,JSON.stringify(old));
 const extra=await client(url,{token,newCharacter:true,name:'Extra',hero:'sword-cockro'});assert.equal(extra.data.message,'character_limit');extra.ws.terminate();
 const bad=await client(url,{token,character:'../main'});assert.equal(bad.data.message,'character_missing');bad.ws.terminate();
 const roster=await client(url,{token,preview:true});assert.equal(roster.data.characters.length,1);assert.equal(roster.data.characters[0].level,37);roster.ws.terminate();
 const restored=await client(url,{token});t.after(()=>restored.ws.terminate());assert.equal(restored.data.save.level,37);assert.equal(restored.data.save.gold,0);assert.equal(restored.data.save.stones,41234);await close(restored,app);
});
