import {createChat} from './chat.js';
import {createCommerce} from './commerce.js';
import {createBillingService} from './play-billing.js';
import {stateForWire} from './state-wire.js';
import {capturePresence,finishFight} from './pvp.js';
import {createAccounts} from './accounts.js';
import {CHARACTER_SLOTS,characterId,characterRoster,readCharacter} from './characters.js';

import http from 'node:http';
import {issueTestTicket,completeTestTicket} from './test-rewards.js';
import {issueRewardTicket,applyVerifiedReward,createSSVVerifier} from './rewarded-ads.js';
import {WebSocketServer} from 'ws';
import {createHash,randomBytes} from 'node:crypto';
import {characterName} from '../web/character-name.js';
import {mkdirSync,readFileSync,writeFileSync,renameSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {World,HEROES,PROTOCOL} from './world.js';
import {fresh,validSave} from '../web/core.js';
export function startServer({port=8091,host='127.0.0.1',directory='./online-data',test=false,testRewards=false,roamers=!test,maxPlayers=Number(process.env.COCKRO_MAX_PLAYERS||64),adUnit=process.env.ADMOB_REWARDED_UNIT_ID||'',ssvVerifier,billingVerifier}={}){
 mkdirSync(directory,{recursive:true,mode:0o700});const accounts=createAccounts(directory);const world=new World({maxPlayers,testRewards,roamers}),connections=new Set(),limits=new Map(),activeAccounts=new Set();let diskFailure=false;const ssvStatus={verified:0,rejected:0,lastError:null};
 function allow(ip){const now=Date.now();let q=(limits.get(ip)||[]).filter(t=>t>now-60000);if(q.length>=Math.max(30,maxPlayers*2))return false;q.push(now);limits.set(ip,q);return true;}
 const persist=p=>{if(p.roamer)return;if(commerce.failed)throw Error('save_unavailable');if(accounts.deletion.isCharacterDeleted(p.id))throw Error('account_deleted');try{if(p.map)capturePresence(p);const path=join(directory,p.id+'.json');writeFileSync(path+'.tmp',JSON.stringify(p.s),{mode:0o600});renameSync(path+'.tmp',path);p.dirty=false;p.lastSaved=Date.now();}catch{diskFailure=true;throw Error('save_unavailable');}};
 const commerce=createCommerce(directory,{players:()=>world.players,getActor:id=>world.getActor(id),capture:capturePresence});
 // Restore only characters that have logged out since persistent presence was introduced.
 for(const file of readdirSync(directory).filter(n=>/^[a-f0-9]{64}\.json$/.test(n))){try{const state=validSave(JSON.parse(readFileSync(join(directory,file),'utf8')));if(state&&!accounts.deletion.isCharacterDeleted(file.slice(0,-5)))world.restore(file.slice(0,-5),state);}catch{diskFailure=true;}}
 const billing=createBillingService(directory,billingVerifier);
 const adsEnabled=/^ca-app-pub-\d{16}\/\d{10}$/.test(adUnit)&&!adUnit.includes('3940256099942544');
 const verifySSV=ssvVerifier||createSSVVerifier({unit:adUnit});let verifying=0;
 const server=http.createServer(async(req,res)=>{
 if(req.url?.startsWith('/online/ads/ssv?')){
  res.setHeader('Cache-Control','no-store');
  if(!adsEnabled||req.method!=='GET'){res.writeHead(404);return res.end();}
  if(verifying>=8){res.writeHead(503);return res.end();}verifying++;
  try{
   const data=await verifySSV(req.url.split('?')[1]);ssvStatus.verified++;
   // Reserved console validation values: verify Google's signature, never grant inventory.
   if(data.user_id==='0'.repeat(64)&&data.custom_data==='0'.repeat(48)){
    const stamp=Number(data.timestamp);
    if(!Number.isFinite(stamp)||Math.abs(Date.now()-stamp)>300000)throw Error('expired_probe');
    res.writeHead(200);return res.end('Verified configuration; no reward granted');
   }
   const live=world.getActor(data.user_id),path=join(directory,data.user_id+'.json');
   if(!live&&!existsSync(path))throw Error('unknown_account');
   const state=structuredClone(live?live.s:JSON.parse(readFileSync(path,'utf8')));
   const changed=applyVerifiedReward(state,data);
   if(changed){const holder={id:data.user_id,s:state};persist(holder);if(live){live.s=state;live.dirty=false;const ticket=state.adTickets.find(t=>t.nonce===data.custom_data);for(const socket of connections){if(socket.player?.()===live){send(socket,world.snapshot(live));send(socket,{type:"adReward",item:ticket.item});}}}}
   res.writeHead(200);res.end('OK');
  }catch(error){ssvStatus.rejected++;ssvStatus.lastError=['wrong_ad_unit','wrong_reward','invalid_reward_identity','invalid_signature','duplicate_parameter','invalid_callback','keys_unavailable','expired_probe','unknown_account','unknown_ticket','expired_reward','used_ticket','duplicate_transaction','inventory_full','save_unavailable'].includes(error.message)?error.message:'verification_failed';res.writeHead(error.message==='save_unavailable'||error.message==='keys_unavailable'?503:400);res.end('Unverified reward');}
  finally{verifying--;}return;
 }
if(req.url==='/online/health'){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.writeHead(diskFailure?503:200);res.end(JSON.stringify({ok:!diskFailure,version:PROTOCOL,release:'4.38.0',identityCleanupPublicKey:accounts.deletion.publicKey,ssv:ssvStatus,advancedSpecies:20,forestSpecies:20,forestRoaming:true,forestPopulation:world.mobs.forest.length,forestBosses:world.mobs.forest.filter(e=>e.def.boss).length,roamingCharacters:world.roamers.size,players:world.players.size,offlinePlayers:world.sleepers.size,persistentPvp:true,groundLoot:true,capacity:world.maxPlayers}));}else{res.writeHead(404);res.end();}});
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
 server.on('upgrade',(req,socket,head)=>{const origin=req.headers.origin;const validOrigin=origin==='https://appassets.androidplatform.net'||origin==='https://cockro-game-updates.vercel.app'||/^https:\/\/cockro-game-updates-[a-z0-9-]+\.vercel\.app$/.test(origin||'')||test&&/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin||'');const ip=req.socket.remoteAddress==='127.0.0.1'?(req.headers['x-real-ip']||req.socket.remoteAddress):req.socket.remoteAddress;if(req.url!=='/online/world'||!validOrigin||connections.size>=maxPlayers+16||!allow(ip)){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));});
 const send=(ws,data)=>{if(ws.readyState===1&&ws.bufferedAmount<262144){if(data.type==='state')data.stalls=data.self.map==='town'?commerce.stalls().filter(it=>Math.hypot(it.x-data.self.x,it.y-data.self.y)<1800).slice(0,64):[];const packet=stateForWire(data,ws.eventCursor||0);ws.send(JSON.stringify(packet));if(packet.type==='state')for(const e of packet.events)ws.eventCursor=Math.max(ws.eventCursor||0,e.id);}else ws.close(1013,'slow_connection');};
 const chat=createChat({connections,send});
 wss.on('connection',ws=>{connections.add(ws);let p=null,count=0,since=Date.now();const timer=setTimeout(()=>ws.close(1008,'handshake_timeout'),6000);ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.on('error',()=>{});
  let managing=false;ws.on('message',async raw=>{if(managing)return;if(commerce.failed){ws.close(1011);return;}try{const now=Date.now();if(now-since>=1000){count=0;since=now;}if(++count>35)throw Error('rate_limit');const d=JSON.parse(raw);if(!d||Array.isArray(d)||typeof d!=='object')throw Error('invalid_message');if(!p&&['manage','authStart','authFinish'].includes(d.type)){managing=true;clearTimeout(timer);try{let result;if(d.type==='authStart'){if(d.token){try{if(activeAccounts.has(accounts.resolve(d.token)))throw Error('already_online');}catch(e){if(e.message!=='login_required')throw e;}}result=await accounts.authStart(d.token,d.purpose);}else if(d.type==='authFinish'){result=await accounts.authFinish(d.flow,d.code);}else{if(activeAccounts.has(accounts.resolve(d.token)))throw Error('already_online');const owner=accounts.resolve(d.token);try{if(d.action==='delete'&&commerce.ownsListedItems(owner,characterId(owner,d.character)))throw Error('shop_items_pending');result=d.action==='purchaseHistory'?billing.history(owner,d.offset??0):await accounts.manage(d.token,d);if(d.action==='purchaseHistory'){const roster=characterRoster(directory,owner);for(const r of result.purchases){const c=roster.find(c=>characterId(owner,c.id)===r.character);r.characterName=r.characterName||(c?'ช่อง '+(CHARACTER_SLOTS.indexOf(c.id)+1)+' (ไม่บันทึกชื่อเดิม)':'ตัวละครที่ถูกลบ');delete r.character;}}}finally{
 if(accounts.deletion.isDeleted(owner))commerce.removeAccount(owner);
 if((result&&d.action==='delete')||accounts.deletion.isDeleted(owner)){
 const ids=d.action==='delete'? [characterId(owner,d.character)]:CHARACTER_SLOTS.map(slot=>characterId(owner,slot));
 for(const id of ids){for(const [key,fight]of [...world.fights])if(fight.a===id||fight.b===id)finishFight(world,key,'interrupted','interrupted',Date.now()/1000);world.sleepers.delete(id);}
 }}
}send(ws,{type:'accountResult',...result});}catch(e){send(ws,{type:'error',message:e.message});}finally{ws.close(1000);}return;}if(!p){if(d.type!=='hello'||d.version!==PROTOCOL)throw Error('version_mismatch');let token=d.token;let created=false;if(d.preview===true&&!token)throw Error('invalid_token');if(d.create===true&&!token){if(!test)throw Error('login_required');if(!HEROES.includes(d.hero))throw Error('invalid_hero');if(readdirSync(directory).filter(n=>n.endsWith('.json')).length>=5000)throw Error('account_capacity');token=randomBytes(32).toString('hex');created=true;}if(typeof token!=='string'||!/^\w{64}$/.test(token))throw Error('invalid_token');const account=created?createHash('sha256').update(token).digest('hex'):accounts.resolve(token);
 for(const slot of CHARACTER_SLOTS){const body=world.sleepers.get(characterId(account,slot));if(body?.dirty)persist(body);}
 const main=created?fresh(d.hero):readCharacter(directory,account);
 if(!main&&!accounts.exists(account))throw Error('account_missing');
 if(d.preview===true){send(ws,{type:'roster',characters:characterRoster(directory,account)});clearTimeout(timer);ws.close(1000);return;}
 if(activeAccounts.has(account)||accounts.busy.has(account))throw Error('already_online');
 let character=d.character||'main',state;
 if(d.newCharacter===true&&!created){
  if(!HEROES.includes(d.hero))throw Error('invalid_hero');
  character=CHARACTER_SLOTS.find(slot=>!readCharacter(directory,account,slot));
  if(!character)throw Error('character_limit');state=fresh(d.hero);
 }else state=character==='main'?main:readCharacter(directory,account,character);
 if(!state)throw Error('character_missing');if(!created&&!d.newCharacter&&!characterName(state.name))throw Error('name_required');
 if(created||d.newCharacter===true){const name=characterName(d.name);if(!name)throw Error('invalid_name');state.name=name;}
 const id=characterId(account,character);
 if(testRewards&&(created||d.newCharacter===true))state.gold=1000000;
 accounts.referrals.deliver(account,character,state,value=>{const file=join(directory,id+'.json');writeFileSync(file+'.tmp',JSON.stringify(value));renameSync(file+'.tmp',file);},{welcome:(created||d.newCharacter===true)&&characterRoster(directory,account).length===0});if(!testRewards)state.townBuffUntil=0;
 p=world.join(id,state);p.account=account;p.character=character;activeAccounts.add(account);persist(p);state=p.s;clearTimeout(timer);
 send(ws,{type:'welcome',release:'4.38.0',id,character,chatEnabled:true,token:created?token:undefined,save:state,adsEnabled,testRewards,billingEnabled:billing.enabled,billingOwner:account});send(ws,world.snapshot(p));return;}
    if(d.type==='chat'){try{chat.handle(p,d);}catch(e){send(ws,{type:'chatError',message:e.message});}return;}
    if(d.type==='commerce'){
     try{const result=commerce.run(p,d);for(const socket of connections){const actor=socket.player?.();if(actor)send(socket,world.snapshot(actor));}send(ws,{type:'commerceResult',ok:true,...result});}
     catch(e){send(ws,{type:'commerceResult',ok:false,message:e.message,...(commerce.failed?{}:commerce.view(p))});if(commerce.failed){diskFailure=true;for(const socket of connections)socket.close(1011);}}return;
    }
    if(d.type==='billingPurchase'){managing=true;p.economyBusy=true;try{const reward=await billing.redeem(p,d,persist);send(ws,world.snapshot(p));send(ws,{type:'billingResult',ok:true,...reward});}catch(e){send(ws,{type:'billingResult',ok:false,message:['payment_pending','wrong_account','wallet_full','billing_unavailable','purchase_busy'].includes(e.message)?e.message:'purchase_not_verified'});}finally{managing=false;p.economyBusy=false;if(ws.readyState!==1)activeAccounts.delete(p.account);}return;}
    if(d.type==='testAdTicket'||d.type==='testAdComplete'){
     if(!testRewards){send(ws,{type:'adError',message:'test_rewards_disabled'});return;}
     try{const copy=structuredClone(p.s);
      if(d.type==='billingPurchase'){managing=true;p.economyBusy=true;try{const reward=await billing.redeem(p,d,persist);send(ws,world.snapshot(p));send(ws,{type:'billingResult',ok:true,...reward});}catch(e){send(ws,{type:'billingResult',ok:false,message:['payment_pending','wrong_account','wallet_full','billing_unavailable','purchase_busy'].includes(e.message)?e.message:'purchase_not_verified'});}finally{managing=false;p.economyBusy=false;if(ws.readyState!==1)activeAccounts.delete(p.account);}return;}
    if(d.type==='testAdTicket'){const ticket=issueTestTicket(copy,d.item);persist({id:p.id,s:copy});p.s=copy;send(ws,{type:'adTicket',user:p.id,nonce:ticket.nonce,item:ticket.item,test:true});}
      else{const reward=completeTestTicket(copy,d.nonce);persist({id:p.id,s:copy});p.s=copy;send(ws,world.snapshot(p));send(ws,{type:'adReward',...reward});}
     }catch(error){send(ws,{type:'adError',message:error.message});}return;
    }
    if(d.type==='adTicket'){
     if(!adsEnabled){send(ws,{type:'adError',message:'ads_disabled'});return;}
     try{const copy=structuredClone(p.s),ticket=issueRewardTicket(copy,d.item);persist({id:p.id,s:copy});p.s=copy;p.dirty=false;send(ws,{type:'adTicket',user:p.id,nonce:ticket.nonce,item:ticket.item});}
     catch(error){send(ws,{type:'adError',message:error.message==='save_unavailable'?'save_unavailable':'ad_pending'});}return;
    }
    world.command(p,d);if(p.dirty&&['op','potion','mpPotion','enter','revive'].includes(d.type))persist(p);if(d.type==='op'){send(ws,world.snapshot(p));send(ws,{type:'opResult',op:d.op,requestId:d.requestId,...p.opResult});}
   }catch(error){send(ws,{type:'error',message:['version_mismatch','login_required','name_required','invalid_name','already_online','room_full','account_missing','save_unavailable','character_missing','character_limit'].includes(error.message)?error.message:'invalid_request'});if(!p||error.message==='save_unavailable')ws.close(1008);}
  });
  ws.on('close',()=>{clearTimeout(timer);connections.delete(ws);if(p){commerce.lockVault(p);world.disconnect(p);try{persist(p);}catch{}if(!managing)activeAccounts.delete(p.account);}});ws.player=()=>p;
 });
 let previous=Date.now();const ticker=setInterval(()=>{const now=Date.now();if(commerce.failed)return;commerce.refreshSigns();world.tick(Math.min(.2,(now-previous)/1000),now/1000);previous=now;for(const p of world.sleepers.values()){if(p.dirty&&now-(p.lastSaved||0)>=1000){try{persist(p);}catch{}}}for(const ws of connections){const p=ws.player();if(!p)continue;try{if(p.dirty&&now-(p.lastSaved||0)>=5000)persist(p);send(ws,world.snapshot(p));}catch{send(ws,{type:'error',message:'save_unavailable'});ws.close(1011);}}},100);
 const deletionWorker=setInterval(()=>accounts.deletion.processPending().catch(()=>{}),60000);accounts.deletion.processPending().catch(()=>{});
 const heartbeat=setInterval(()=>{for(const ws of connections){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}for(const [ip,q] of limits)if(q.at(-1)<Date.now()-60000)limits.delete(ip);},20000);
 server.listen(port,host);const close=async()=>{clearInterval(ticker);clearInterval(heartbeat);clearInterval(deletionWorker);for(const key of [...world.fights.keys()])finishFight(world,key,'interrupted','interrupted',Date.now()/1000);for(const p of world.actors()){try{persist(p);}catch{}}for(const ws of connections)ws.terminate();await new Promise(ok=>server.close(ok));};return {server,world,close};
}







