import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {startServer} from '../server/server.js';
import {PROTOCOL} from '../server/world.js';
import {accountDropMultiplier,baseKillCoins} from '../web/token-economy.js';
function client(url,hello){return new Promise((resolve,reject)=>{const ws=new WebSocket(url,{origin:'http://localhost:8080'}),messages=[];ws.on('error',reject);ws.on('open',()=>ws.send(JSON.stringify(hello)));ws.on('message',raw=>{const m=JSON.parse(raw);messages.push(m);if(m.type==='welcome')resolve({ws,messages,welcome:m});if(m.type==='error')reject(Error('server '+m.message));});});}
async function until(fn){for(let i=0;i<80;i++){const v=fn();if(v)return v;await new Promise(ok=>setTimeout(ok,50));}throw Error('timed out');}
test('drops halve for every extra zero of accounts from 1,000 on',()=>{
 assert.equal(accountDropMultiplier(1),1);assert.equal(accountDropMultiplier(999),1);assert.equal(accountDropMultiplier(1000),.5);
 assert.equal(accountDropMultiplier(9999),.5);assert.equal(accountDropMultiplier(10000),.25);assert.equal(accountDropMultiplier(100000),.125);
 assert.equal(baseKillCoins({level:1,accounts:50}),5100);assert.equal(baseKillCoins({level:1,accounts:5000}),2550);
});
test('only the verified owner account sees and uses the admin panel; grants are booked and logged',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cockro-admin-')),app=startServer({port:0,directory,test:true});await once(app.server,'listening');
 t.after(async()=>{await app.close();rmSync(directory,{recursive:true,force:true});});
 const url=`ws://127.0.0.1:${app.server.address().port}/online/world`,hello={type:'hello',version:PROTOCOL,create:true,hero:'sword-cockro'};
 const owner=await client(url,{...hello,name:'Owner'}),other=await client(url,{...hello,name:'Player'});t.after(()=>other.ws.terminate());
 assert.equal(owner.welcome.admin,false);assert.equal(other.welcome.admin,false);
 other.ws.send(JSON.stringify({type:'admin',action:'list'}));const denied=await until(()=>other.messages.find(m=>m.type==='adminResult'));assert.equal(denied.ok,false);assert.equal(denied.message,'forbidden');
 const profile=join(directory,'accounts','profile-'+createHash('sha256').update(owner.welcome.id).digest('hex')+'.json');
 mkdirSync(join(directory,'accounts'),{recursive:true});const meta=existsSync(profile)?JSON.parse(readFileSync(profile,'utf8')):{};writeFileSync(profile,JSON.stringify({...meta,uid:'google-owner',email:'Sunan.Tongsan@gmail.com'}));
 const admin=owner;t.after(()=>admin.ws.terminate());
 admin.ws.send(JSON.stringify({type:'admin',action:'list'}));const list=await until(()=>admin.messages.find(m=>m.type==='adminResult'&&m.rows));
 assert.equal(list.accounts,2);assert(list.rows.some(r=>r.self&&r.name==='Owner'));
 const target=other.welcome.id,before=app.world.players.get(target).s.stones,minted=app.world.sessions.get(target).economy.minted;
 admin.ws.send(JSON.stringify({type:'admin',action:'grant',id:target,amount:5_000_000}));const g=await until(()=>admin.messages.find(m=>m.type==='adminResult'&&m.granted));
 assert.equal(g.granted.after,before+5_000_000);assert.equal(app.world.players.get(target).s.stones,before+5_000_000);
 assert.equal(JSON.parse(readFileSync(join(directory,target+'.json'),'utf8')).stones,before+5_000_000);
 assert.equal(app.world.sessions.get(target).economy.minted,minted+5_000_000);
 admin.ws.send(JSON.stringify({type:'admin',action:'grant',id:admin.welcome.id,amount:2_000_000}));await until(()=>admin.messages.filter(m=>m.type==='adminResult'&&m.granted).length===2);
 admin.ws.send(JSON.stringify({type:'admin',action:'grant',id:target,amount:-1e12}));const cut=await until(()=>admin.messages.filter(m=>m.type==='adminResult'&&m.granted).at(2));assert.equal(cut.granted.after,0);
 for(const bad of [{id:'x',amount:1},{id:target,amount:1.5},{id:target,amount:0}]){admin.ws.send(JSON.stringify({type:'admin',action:'grant',...bad}));}
 await until(()=>admin.messages.filter(m=>m.type==='adminResult'&&m.ok===false).length===3);
 const log=readFileSync(join(directory,'admin-log.jsonl'),'utf8').trim().split('\n').map(l=>JSON.parse(l));assert.equal(log.length,3);assert.equal(log[0].by,owner.welcome.id);
});
