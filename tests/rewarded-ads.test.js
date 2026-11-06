import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WebSocket} from 'ws';
import {fresh,validSave} from '../web/core.js';
import {issueRewardTicket,applyVerifiedReward,createSSVVerifier} from '../server/rewarded-ads.js';
import {startServer} from '../server/server.js';
const unit='ca-app-pub-1234567890123456/1234567890', user='a'.repeat(64);
const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),pem=pair.publicKey.export({type:'spki',format:'pem'});
const verifier=()=>createSSVVerifier({unit,fetchKeys:async()=>({ok:true,json:async()=>({keys:[{keyId:42,pem}]})})});
function signed(p){const content=new URLSearchParams(p).toString();return content+'&signature='+sign('sha256',Buffer.from(content),pair.privateKey).toString('base64url')+'&key_id=42';}
function callback(t,extra={}){return {ad_unit:unit.split('/').at(-1),user_id:user,custom_data:t.nonce,reward_amount:'1',reward_item:'item',timestamp:String(Date.now()),transaction_id:'tx1',...extra};}
test('signed callback grants requested item once and survives save/restart',async()=>{
 let s=fresh('sword-cockro');const t=issueRewardTicket(s,'ruby'),p=await verifier()(signed(callback(t)));
 assert.equal(applyVerifiedReward(s,p),true);assert.equal(s.upgradeItems.ruby,1);
 s=validSave(JSON.parse(JSON.stringify(s)));assert.equal(applyVerifiedReward(s,p),false);assert.equal(s.upgradeItems.ruby,1);
 assert.throws(()=>applyVerifiedReward(s,{...p,transaction_id:'tx2'}));assert.equal(s.gold,100000);assert.equal(s.stones,0);
});
test('tampering, wrong unit/reward, missing signature, duplicate parameter rejected',async()=>{
 const s=fresh('sword-cockro'),t=issueRewardTicket(s,'crystal'),v=verifier(),raw=signed(callback(t));
 await assert.rejects(v(raw.replace('reward_amount=1','reward_amount=100')));
 for(const changes of [{ad_unit:'other'},{ad_unit:'ca-app-pub-9999999999999999/1234567890'},{ad_unit:'9999999999'},{reward_amount:'2'},{reward_item:'gold'},{user_id:'../file'},{custom_data:'bad'}])await assert.rejects(v(signed(callback(t,changes))));
 await assert.rejects(v('custom_data='+t.nonce));
 const c=new URLSearchParams(callback(t)).toString()+'&reward_amount=1';
 await assert.rejects(v(c+'&signature='+sign('sha256',Buffer.from(c),pair.privateKey).toString('base64url')+'&key_id=42'));
 assert.equal(s.upgradeItems.crystal,0);
});
test('unknown/expired ticket, duplicate transaction, full inventory and invalid targets rejected',()=>{
 const s=fresh('sword-cockro'),now=Date.now(),t=issueRewardTicket(s,'meteor',now);
 assert.notEqual(issueRewardTicket(s,'ruby',now).nonce,t.nonce);assert.throws(()=>issueRewardTicket(s,'__proto__',now));
 assert.throws(()=>applyVerifiedReward(s,callback(t,{custom_data:'f'.repeat(48)})));
 assert.throws(()=>applyVerifiedReward(s,callback(t,{timestamp:String(now+3600001)}),now+3600001));
 assert.throws(()=>applyVerifiedReward(s,callback(t,{timestamp:String(now)}),now+86400001));
 s.upgradeItems.meteor=99999;assert.throws(()=>applyVerifiedReward(s,callback(t)));s.upgradeItems.meteor=0;
 applyVerifiedReward(s,callback(t));const second=issueRewardTicket(s,'ruby',now+100000);
 assert.throws(()=>applyVerifiedReward(s,callback(second,{timestamp:String(now+100000)}),now+100000));
});
test('key failure and disabled production fail closed',async()=>{
 const t=issueRewardTicket(fresh('sword-cockro'),'ruby');
 await assert.rejects(createSSVVerifier({unit,fetchKeys:async()=>({ok:false})})(signed(callback(t))));
 await assert.rejects(createSSVVerifier({unit:''})(signed(callback(t))));
});
function next(ws,predicate){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',receive);reject(Error('timeout'));},5000);function receive(raw){const d=JSON.parse(raw);if(predicate(d)){clearTimeout(timer);ws.off('message',receive);resolve(d);}}ws.on('message',receive);});}
test('console verification requires signed fresh probe and never writes accounts or rewards',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'cockro-ads-probe-'));
 const app=startServer({directory,port:0,test:true,adUnit:unit,ssvVerifier:verifier()});
 try{
  await new Promise(ok=>app.server.once('listening',ok));
  const initialFiles=readdirSync(directory);
  const base='http://127.0.0.1:'+app.server.address().port+'/online/ads/ssv?';
  const p=callback({nonce:'0'.repeat(48)},{user_id:'0'.repeat(64)}),raw=signed(p);
  assert.equal((await fetch(base+raw)).status,200);
  assert.equal((await fetch(base+signed({...p,ad_unit:'console-probe',reward_item:'console-probe'}))).status,200);
  assert.equal((await fetch(base+raw)).status,200);
  assert.equal((await fetch(base+raw.replace('reward_amount=1','reward_amount=2'))).status,400);
  assert.equal((await fetch(base+signed({...p,timestamp:String(Date.now()-360000)}))).status,400);
  assert.equal((await fetch(base+signed({...p,user_id:user}))).status,400);
  assert.equal((await fetch(base+new URLSearchParams(p))).status,400);
  assert.deepEqual(readdirSync(directory),initialFiles);
  assert.equal(app.world.players.size,0);
 }finally{await app.close();rmSync(directory,{recursive:true,force:true});}
});
async function connect(port,token){const ws=new WebSocket('ws://127.0.0.1:'+port+'/online/world',{origin:'http://localhost'});await new Promise(ok=>ws.once('open',ok));const ready=next(ws,d=>d.type==='welcome');ws.send(JSON.stringify({type:'hello',version:'cockro-online-4',create:!token,name:'PatchTester',hero:'sword-cockro',token}));return {ws,welcome:await ready};}
test('HTTP SSV verifies, persists offline, and replay cannot double-grant after restart',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'cockro-ads-'));let app;
 try{
 app=startServer({directory,port:0,test:true,adUnit:unit,ssvVerifier:verifier()});await new Promise(ok=>app.server.once('listening',ok));let port=app.server.address().port;
 const {ws,welcome}=await connect(port);assert.equal(welcome.adsEnabled,true);
 const pending=next(ws,d=>d.type==='adTicket');ws.send(JSON.stringify({type:'adTicket',item:'diamond'}));const ticket=await pending;
 ws.close();await new Promise(ok=>ws.once('close',ok));
 const raw=signed(callback(ticket,{user_id:ticket.user}));
 assert.equal((await fetch('http://127.0.0.1:'+port+'/online/ads/ssv?'+raw)).status,200);
 await app.close();app=startServer({directory,port:0,test:true,adUnit:unit,ssvVerifier:verifier()});await new Promise(ok=>app.server.once('listening',ok));port=app.server.address().port;
 assert.equal((await fetch('http://127.0.0.1:'+port+'/online/ads/ssv?'+raw)).status,200);
 const reconnect=await connect(port,welcome.token);assert.equal(reconnect.welcome.save.upgradeItems.diamond,1);
 assert.equal((await fetch('http://127.0.0.1:'+port+'/online/ads/ssv?'+raw.replace('reward_amount=1','reward_amount=9'))).status,400);
 reconnect.ws.close();
 }finally{if(app)await app.close();rmSync(directory,{recursive:true,force:true});}
});




test('failed or abandoned attempts can retry immediately, even after restoring saved data',()=>{
 let s=fresh('sword-cockro');const now=Date.now(),first=issueRewardTicket(s,'ruby',now);
 s=validSave(JSON.parse(JSON.stringify(s)));
 const retry=issueRewardTicket(s,'ruby',now+1),checkin=issueRewardTicket(s,'dailyCheckin',now+2);
 assert.notEqual(retry.nonce,first.nonce);assert.notEqual(checkin.nonce,retry.nonce);
 assert.equal(s.upgradeItems.ruby,0);
 const proof=callback(retry,{timestamp:String(now+3),transaction_id:'retry-success'});
 assert.equal(applyVerifiedReward(s,proof,now+3),true);
 assert.equal(applyVerifiedReward(s,proof,now+4),false);
 assert.throws(()=>applyVerifiedReward(s,callback(first,{transaction_id:'retry-success'}),now+4));
 assert.equal(s.upgradeItems.ruby,1);
});
test('ticket retry retains the bounded daily request limit',()=>{
 const s=fresh('sword-cockro'),now=Date.now();
 for(let i=0;i<100;i++)issueRewardTicket(s,'ruby',now+i);
 assert.throws(()=>issueRewardTicket(s,'ruby',now+100),/ad_limit/);
});
