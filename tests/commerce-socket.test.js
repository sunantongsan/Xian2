import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import WebSocket from 'ws';
import {startServer} from '../server/server.js';
test('real sockets: offline shop survives server restart; only one concurrent buyer receives item',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'commerce-socket-'));let app,sockets=[];t.after(async()=>{for(const s of sockets)s.terminate();await app?.close();rmSync(directory,{recursive:true,force:true});});
 const start=async()=>{app=startServer({port:0,directory,test:true});await once(app.server,'listening');};await start();
 const receive=(ws,type)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',on);reject(Error('timeout '+type));},4000);function on(raw){const d=JSON.parse(raw);if(d.type===type){clearTimeout(timer);ws.off('message',on);resolve(d);}}ws.on('message',on);});
 async function connect(name,token){const ws=new WebSocket(`ws://127.0.0.1:${app.server.address().port}/online/world`,{origin:'http://localhost:9999'});sockets.push(ws);await once(ws,'open');const welcome=receive(ws,'welcome');ws.send(JSON.stringify({type:'hello',version:'cockro-online-4',create:!token,token,hero:'sword-cockro',name}));return {ws,w:await welcome};}
 async function cmd(ws,action,fields={}){const reply=receive(ws,'commerceResult');ws.send(JSON.stringify({type:'commerce',action,...fields}));return reply;}
 const seller=await connect('Seller');const actor=app.world.players.get(seller.w.id);actor.s.potions=5;let r=await cmd(seller.ws,'view');r=await cmd(seller.ws,'openShop',{revision:r.revision,title:'Offline Shop'});r=await cmd(seller.ws,'listItem',{revision:r.revision,kind:'potion',id:'hp',quantity:2,price:10,currency:'stones'});assert.equal(r.ok,true);const listing=r.ownShop.listings[0];seller.ws.close();await once(seller.ws,'close');await new Promise(r=>setTimeout(r,30));await app.close();app=null;await start();
 const b=await connect('Buyer1'),c=await connect('Buyer2');for(const x of [b,c])app.world.players.get(x.w.id).s.stones=100;
 const view=await cmd(b.ws,'view');assert.equal(view.shops.length,1);const fields={revision:view.revision,seller:seller.w.id,key:listing.key,price:10,currency:'stones'};
 const results=await Promise.all([cmd(b.ws,'buy',fields),cmd(c.ws,'buy',fields)]);assert.equal(results.filter(x=>x.ok).length,1);assert.equal(JSON.parse(readFileSync(join(directory,seller.w.id+'.json'))).stones,seller.w.save.stones+10);assert.equal(results.filter(x=>x.message==='stale_market').length,1);
});

