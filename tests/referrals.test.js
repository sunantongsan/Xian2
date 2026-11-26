import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createReferrals} from '../server/referrals.js';
import {fresh,validSave} from '../web/core.js';
import {INVITER,INVITED,WELCOME,inviteLink} from '../web/invite-rules.js';
function setup(t){
 const dir=mkdtempSync(join(tmpdir(),'cockro-referral-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 return {dir,r:createReferrals(dir)};
}
const full=100_000_000_000;
const freshHero=()=>fresh('sword-cockro');

test('player-created codes are stable, unique and case-insensitive',t=>{
 const {r}=setup(t);
 assert.equal(r.status('alice','a').code,null);
 assert.equal(r.createCode('alice','a',' aLIce ').code,'ALICE');
 assert.equal(r.createCode('alice','a','other').code,'ALICE');
 assert.throws(()=>r.createCode('bob','b','alice'),/referral_taken/);
 assert.throws(()=>r.createCode('bob','b','<b>'),/referral_format/);
 assert.throws(()=>r.createCode('guest',null,'CODE'),/google_required/);
 assert.match(inviteLink('alice'),/invite.html\?ref=ALICE$/);
});
test('a first registration commits both awards once; invalid codes never consume eligibility',t=>{
 const {dir,r}=setup(t);r.createCode('alice','a','ALICE');
 assert.throws(()=>r.register('bob','b','missing',full),/referral_invalid/);
 assert.throws(()=>r.register('alice','a','ALICE',full),/referral_self/);
 assert.throws(()=>r.register('bob','b','ALICE',INVITER),/reward_budget/);
 assert.equal(r.issued(),0);
 assert.equal(r.register('bob','b','alice',full),'alice');
 const restarted=createReferrals(dir);
 restarted.register('bob','b','',full);
 assert.equal(restarted.issued(),INVITER+INVITED);
 for(const [account,amount] of [['alice',INVITER],['bob',INVITED]]){
  const s=freshHero();restarted.deliver(account,'main',s,()=>{});
  assert.equal(s.stones,amount);
  restarted.deliver(account,'main',s,()=>assert.fail());
  restarted.deliver(account,'slot2',freshHero(),()=>assert.fail());
 }
 restarted.remove('bob');
 restarted.register('replacement','b','ALICE',full);
 assert.equal(restarted.issued(),INVITER+INVITED);
});
test('organic registration gets only welcome and pending delivery survives a crash',t=>{
 const {r,dir}=setup(t);r.register('new','g','',full);
 r.createCode('friend','f','FRND');
 r.register('new','g','FRND',full);
 assert.equal(r.issued(),WELCOME);
 let disk;
 assert.throws(()=>r.deliver('new','main',freshHero(),s=>{disk=validSave(s);throw Error('crash after saving');}),/crash/);
 const restarted=createReferrals(dir);
 restarted.deliver('new','slot2',freshHero(),()=>assert.fail());
 restarted.deliver('new','main',disk,()=>assert.fail());
 assert.equal(disk.stones,WELCOME);
 assert.equal(restarted.status('new','g').pending,0);
});
test('legacy invite links and unpaid balances retain their original value',t=>{
 const {dir,r}=setup(t);const old='AB0123456789';
 writeFileSync(join(dir,'referrals.json'),JSON.stringify({members:{[old]:{account:'old',identity:'oldhash'}},claims:{},awards:{oldReceipt:{account:'old',amount:500000,delivered:false}}}));
 assert.equal(r.status('old','uid').code,old);
 r.register('new','n',old,full);
 const s=freshHero();assert.equal(r.deliver('old','main',s,()=>{}),50000); // same baht value after the 7.8.0 reprice
 assert.equal(s.stones,INVITER+50000);assert.equal(r.issued(),INVITER+INVITED);
});

test('registration over the game socket credits the inviter wallet and charges supply once',async t=>{
 const {startServer}=await import('../server/server.js');
 const {createHash}=await import('node:crypto');
 const {once}=await import('node:events');
 const {default:WebSocket}=await import('ws');
 const {mkdirSync,readFileSync}=await import('node:fs');
 const dir=mkdtempSync(join(tmpdir(),'cockro-signup-'));
 const hash=s=>createHash('sha256').update(s).digest('hex');
 const tokens=['a','b'].map(c=>c.repeat(64)),ids=tokens.map(t=>hash(t));
 const auth=join(dir,'accounts');mkdirSync(auth);
 for(let i=0;i<2;i++){
  writeFileSync(join(auth,'profile-'+hash(ids[i])+'.json'),JSON.stringify({uid:'google-'+i,googleSubject:'subject-'+i}));
  writeFileSync(join(auth,'session-'+hash(tokens[i])+'.json'),JSON.stringify({account:ids[i],persistent:true}));
 }
 const app=startServer({port:0,directory:dir,test:true});
 await once(app.server,'listening');
 const url='ws://127.0.0.1:'+app.server.address().port+'/online/world';
 t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true});});
 async function request(i,data,stay=false){
  const ws=new WebSocket(url,{origin:'http://localhost:8080'});
  await once(ws,'open');
  const first=once(ws,'message');ws.send(JSON.stringify({version:'cockro-online-4',token:tokens[i],...data}));
  const result=JSON.parse((await first)[0]);
  if(!stay){const closed=once(ws,'close');ws.close();await closed;}
  return {ws,result};
 }
 const create={type:'hello',newCharacter:true,hero:'sword-cockro',name:'Tester'};
 assert.equal((await request(0,create)).result.save.stones,WELCOME);
 assert.equal((await request(0,{type:'manage',action:'createReferralCode',code:'FRIEND'})).result.code,'FRIEND');
 const online=await request(0,{type:'hello'},true);
 try{
  assert.equal((await request(1,{...create,inviteCode:'wrong'})).result.message,'referral_invalid');
  assert.equal((await request(1,{...create,inviteCode:'friend'})).result.save.stones,INVITED);
  assert.equal(app.world.getActor(ids[0]).s.stones,WELCOME+INVITER);
  assert.equal((await request(1,{type:'hello'})).result.save.stones,INVITED);
  const economy=JSON.parse(readFileSync(join(dir,'economy.json')));
  assert.equal(economy.referralIssued,WELCOME+INVITED+INVITER);
  assert.equal(economy.minted,economy.referralIssued);
 }finally{const closed=once(online.ws,'close');online.ws.close();await closed;}
});

test('promotion amounts and repeat enrolment with a new game ID',t=>{
 const {r}=setup(t);
 assert.deepEqual([INVITER,INVITED,WELCOME],[2000000,500000,100000]);
 r.createCode('alice','uid-a','ALICE');
 r.register('bob','uid-b','ALICE',full,'stable-b');
 r.remove('bob');
 r.register('replacement','different-uid','ALICE',full,'stable-b');
 assert.equal(r.status('alice','uid-a').pending,INVITER);
 assert.equal(r.issued(),INVITER+INVITED);
});
