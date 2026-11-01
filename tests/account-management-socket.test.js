import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import WebSocket from 'ws';
import {createAccounts} from '../server/accounts.js';
import {characterId} from '../server/characters.js';
import {createBillingService} from '../server/play-billing.js';
import {startServer} from '../server/server.js';
import {fresh} from '../web/core.js';
const hash=v=>createHash('sha256').update(v).digest('hex');
function setup(t,options){const dir=mkdtempSync(join(tmpdir(),'account-management-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const token='a'.repeat(64),account=hash(token),s=fresh('sword-cockro');s.name='QA Hero';writeFileSync(join(dir,account+'.json'),JSON.stringify(s));return {dir,token,account,api:createAccounts(dir,options)};}
async function password(f){await f.api.manage(f.token,{action:'setPassword',password:'safe-pass-429'});}
test('real socket account deletion removes offline actor and survives ticks and restart',async t=>{
 const f=setup(t);await password(f);const app=startServer({port:0,directory:f.dir,test:true});await once(app.server,'listening');let stopped=false;t.after(async()=>{if(!stopped)await app.close();});const url=`ws://127.0.0.1:${app.server.address().port}/online/world`;
 async function request(data){const ws=new WebSocket(url,{origin:'http://localhost:9999'});await once(ws,'open');return new Promise((resolve,reject)=>{ws.on('message',raw=>{const d=JSON.parse(raw);if(['welcome','accountResult','error'].includes(d.type)){ws.close();resolve(d);}});ws.on('error',reject);ws.send(JSON.stringify(data));});}
 await request({type:'hello',version:'cockro-online-2',token:f.token});await new Promise(r=>setTimeout(r,80));assert(app.world.sleepers.has(f.account));
 const result=await request({type:'manage',action:'deleteAccount',token:f.token,password:'safe-pass-429',confirmText:'ลบบัญชี COCKRO'});assert(result.deleted);assert(!app.world.sleepers.has(f.account));await new Promise(r=>setTimeout(r,150));await app.close();stopped=true;assert(!existsSync(join(f.dir,f.account+'.json')));assert.throws(()=>createAccounts(f.dir).resolve(f.token));
});
