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
test('four character slots preserve the original save, enforce ownership and grant test gold once',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cockro-four-'));const app=startServer({port:0,directory,test:true,testRewards:true});await once(app.server,'listening');t.after(async()=>{await app.close();rmSync(directory,{recursive:true,force:true});});const url=`ws://127.0.0.1:${app.server.address().port}/online/world`;
 const main=await client(url,{create:true,name:'Tester',hero:'sword-cricket'});assert.equal(main.data.character,'main');assert(main.data.save.stones>=50000);await close(main,app);
 const token=main.data.token,path=join(directory,main.data.id+'.json');const old=JSON.parse(readFileSync(path));old.level=37;old.gold=123456;old.stones=41234;writeFileSync(path,JSON.stringify(old));const before=readFileSync(path,'utf8');
 for(let n=2;n<=4;n++){
  const c=await client(url,{token,newCharacter:true,name:'Tester',hero:'sword-cricket'});assert.equal(c.data.character,'slot'+n);assert.equal(c.data.save.level,1);assert.equal(c.data.save.stones,50000);assert.equal(c.data.save.gold,1000000);
  const concurrent=await client(url,{token,character:'main'});assert.equal(concurrent.data.message,'already_online');concurrent.ws.terminate();
  await close(c,app);
  const again=await client(url,{token,character:'slot'+n});assert.equal(again.data.id,c.data.id);assert.equal(again.data.save.stones,c.data.save.stones);await close(again,app);
 }
 const excess=await client(url,{token,newCharacter:true,name:'Tester',hero:'sword-cricket'});assert.equal(excess.data.message,'character_limit');excess.ws.terminate();
 const bad=await client(url,{token,character:'../main'});assert.equal(bad.data.message,'character_missing');bad.ws.terminate();
 const roster=await client(url,{token,preview:true});assert.equal(roster.data.characters.length,4);assert.equal(roster.data.characters[0].level,37);roster.ws.terminate();assert.equal(readFileSync(path,'utf8'),before);
 const other=await client(url,{create:true,name:'Tester',hero:'sword-cricket'});await close(other,app);const foreign=await client(url,{token:other.data.token,character:'slot2'});assert.equal(foreign.data.message,'character_missing');foreign.ws.terminate();
 const restored=await client(url,{token});assert.equal(restored.data.save.level,37);assert.equal(restored.data.save.gold,123456);assert.equal(restored.data.save.stones,41234);await close(restored,app);
});

