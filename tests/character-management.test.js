import {MERCHANT_UV} from '../web/merchant.js';import {MAPS as SHOP_MAPS,toWorld as shopWorld} from '../web/maps.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import WebSocket from 'ws';
import {fresh,validSave,allocateStats} from '../web/core.js';
import {characterName} from '../web/character-name.js';
import {startServer} from '../server/server.js';
import {World} from '../server/world.js';
test('bulk allocation is atomic and rejects negative, fractional, unknown and excessive values',()=>{
 const s=fresh('sword-cockro');s.level=3;s.statPoints=20;delete s.statProgressionVersion;delete s.legacyStatLevels;
 for(const values of [{str:21},{str:-1},{str:.5},{luck:1},{str:Infinity},{str:NaN},[],{str:'1'},{str:0}]){const before=structuredClone(s);assert.equal(allocateStats(s,values),false);assert.deepEqual(s,before);}
 assert.equal(allocateStats(s,{str:12,vit:5,int:2,agi:1}),true);assert.equal(s.statPoints,0);assert.deepEqual(validSave(s).attributes,s.attributes);
 const w=new World(),p=w.join('test',s);w.command(p,{type:'op',op:'allocateStats',values:{str:1}},100);assert.equal(p.opResult.ok,false);assert.equal(s.attributes.str,12);
});
test('Thai and English names persist, markup/control and blank names fail',()=>{
 for(const name of ['  ','a','<script>','abc\nxyz','a'.repeat(21),'💥💥'])assert.equal(characterName(name),null);
 const s=fresh('sword-cockro');s.name=characterName('  ฮีโร่  ไทย-01  ');assert.equal(s.name,'ฮีโร่ ไทย-01');assert.equal(validSave(s).name,s.name);
});
test('real socket rejects unnamed creation and confirms gold purchases after saving',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'cockro-419-')),app=startServer({port:0,directory,test:true,testRewards:true});await once(app.server,'listening');t.after(async()=>{await app.close();rmSync(directory,{recursive:true,force:true});});
 const url=`ws://127.0.0.1:${app.server.address().port}/online/world`;
 async function connect(name){const ws=new WebSocket(url,{origin:'http://localhost'});await once(ws,'open');const result=once(ws,'message');ws.send(JSON.stringify({type:'hello',version:'cockro-online-2',create:true,hero:'sword-cockro',name}));return {ws,result:JSON.parse((await result)[0])};}
 const bad=await connect('');assert.equal(bad.result.message,'invalid_name');bad.ws.terminate();
 const c=await connect('ทดสอบทอง');t.after(()=>c.ws.terminate());assert.equal(c.result.save.name,'ทดสอบทอง');const p=app.world.players.get(c.result.id);p.s.stones=2000;const gold=p.s.gold;
 Object.assign(p,shopWorld(MERCHANT_UV,SHOP_MAPS.town));const receipt=new Promise(resolve=>c.ws.on('message',raw=>{const d=JSON.parse(raw);if(d.type==='opResult')resolve(d);}));
 c.ws.send(JSON.stringify({type:'op',op:'buyShopGear',slot:'weapon',requestId:'purchase-test'}));const result=await receipt;assert.equal(result.ok,true);assert.equal(result.requestId,'purchase-test');
 const saved=JSON.parse(readFileSync(join(directory,p.id+'.json')));assert.equal(saved.gold,gold-1000);assert.equal(saved.stones,2000);assert.equal(saved.bag.length,c.result.save.bag.length+1);assert.equal(saved.name,'ทดสอบทอง');
 const before=structuredClone(p.s);p.s.gold=0;app.world.command(p,{type:'op',op:'buyShopGear',slot:'weapon'},Date.now()/1000+1);assert.equal(p.opResult.ok,false);assert.deepEqual(p.s.bag,before.bag);
});




