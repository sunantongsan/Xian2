import http from 'node:http';
import {issueRewardTicket,applyVerifiedReward,createSSVVerifier} from './rewarded-ads.js';
import {WebSocketServer} from 'ws';
import {createHash,randomBytes} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,renameSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {World,HEROES,PROTOCOL} from './world.js';
import {fresh,validSave} from '../web/core.js';
export function startServer({port=8091,host='127.0.0.1',directory='./online-data',test=false,maxPlayers=Number(process.env.COCKRO_MAX_PLAYERS||64),adUnit=process.env.ADMOB_REWARDED_UNIT_ID||'',ssvVerifier}={}){
 mkdirSync(directory,{recursive:true,mode:0o700});const world=new World({maxPlayers}),connections=new Set(),limits=new Map();let diskFailure=false;const ssvStatus={verified:0,rejected:0,lastError:null};
 function allow(ip){const now=Date.now();let q=(limits.get(ip)||[]).filter(t=>t>now-60000);if(q.length>=Math.max(30,maxPlayers*2))return false;q.push(now);limits.set(ip,q);return true;}
 const persist=p=>{try{const path=join(directory,p.id+'.json');writeFileSync(path+'.tmp',JSON.stringify(p.s),{mode:0o600});renameSync(path+'.tmp',path);p.dirty=false;}catch{diskFailure=true;throw Error('save_unavailable');}};
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
   const live=world.players.get(data.user_id),path=join(directory,data.user_id+'.json');
   if(!live&&!existsSync(path))throw Error('unknown_account');
   const state=structuredClone(live?live.s:JSON.parse(readFileSync(path,'utf8')));
   const changed=applyVerifiedReward(state,data);
   if(changed){const holder={id:data.user_id,s:state};persist(holder);if(live){live.s=state;live.dirty=false;}}
   res.writeHead(200);res.end('OK');
  }catch(error){ssvStatus.rejected++;ssvStatus.lastError=['wrong_ad_unit','wrong_reward','invalid_reward_identity','invalid_signature','duplicate_parameter','invalid_callback','keys_unavailable','expired_probe','unknown_account','unknown_ticket','expired_reward','used_ticket','duplicate_transaction','inventory_full','save_unavailable'].includes(error.message)?error.message:'verification_failed';res.writeHead(error.message==='save_unavailable'||error.message==='keys_unavailable'?503:400);res.end('Unverified reward');}
  finally{verifying--;}return;
 }
if(req.url==='/online/health'){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.writeHead(diskFailure?503:200);res.end(JSON.stringify({ok:!diskFailure,version:PROTOCOL,release:'4.13.0',ssv:ssvStatus,advancedSpecies:20,players:world.players.size,capacity:world.maxPlayers}));}else{res.writeHead(404);res.end();}});
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
 server.on('upgrade',(req,socket,head)=>{const origin=req.headers.origin;const validOrigin=origin==='https://appassets.androidplatform.net'||origin==='https://cockro-game-updates.vercel.app'||/^https:\/\/cockro-game-updates-[a-z0-9-]+\.vercel\.app$/.test(origin||'')||test&&/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin||'');const ip=req.socket.remoteAddress==='127.0.0.1'?(req.headers['x-real-ip']||req.socket.remoteAddress):req.socket.remoteAddress;if(req.url!=='/online/world'||!validOrigin||connections.size>=maxPlayers+16||!allow(ip)){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));});
 const send=(ws,data)=>{if(ws.readyState===1&&ws.bufferedAmount<262144)ws.send(JSON.stringify(data));else ws.close(1013,'slow_connection');};
 wss.on('connection',ws=>{connections.add(ws);let p=null,count=0,since=Date.now();const timer=setTimeout(()=>ws.close(1008,'handshake_timeout'),6000);ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.on('error',()=>{});
  ws.on('message',raw=>{try{const now=Date.now();if(now-since>=1000){count=0;since=now;}if(++count>35)throw Error('rate_limit');const d=JSON.parse(raw);if(!d||Array.isArray(d)||typeof d!=='object')throw Error('invalid_message');if(!p){if(d.type!=='hello'||d.version!==PROTOCOL)throw Error('version_mismatch');let token=d.token;let created=false;if(d.preview===true&&!token)throw Error('invalid_token');if(d.create===true&&!token){if(!HEROES.includes(d.hero))throw Error('invalid_hero');if(readdirSync(directory).filter(n=>n.endsWith('.json')).length>=5000)throw Error('account_capacity');token=randomBytes(32).toString('hex');created=true;}if(typeof token!=='string'||!/^\w{64}$/.test(token))throw Error('invalid_token');const id=createHash('sha256').update(token).digest('hex');const path=join(directory,id+'.json');if(!created&&!existsSync(path))throw Error('account_missing');const state=created?fresh(d.hero):validSave(JSON.parse(readFileSync(path,'utf8')));if(!state)throw Error('invalid_save');if(d.preview===true){send(ws,{type:'roster',characters:[{id:'main',hero:state.hero,level:state.level}]});clearTimeout(timer);ws.close(1000);return;}p=world.join(id,state);persist(p);clearTimeout(timer);send(ws,{type:'welcome',id,token:created?token:undefined,save:state,adsEnabled});send(ws,world.snapshot(p));return;}
    if(d.type==='adTicket'){
     if(!adsEnabled){send(ws,{type:'adError',message:'ads_disabled'});return;}
     try{const copy=structuredClone(p.s),ticket=issueRewardTicket(copy,d.item);persist({id:p.id,s:copy});p.s=copy;p.dirty=false;send(ws,{type:'adTicket',user:p.id,nonce:ticket.nonce,item:ticket.item});}
     catch(error){send(ws,{type:'adError',message:error.message==='save_unavailable'?'save_unavailable':'ad_pending'});}return;
    }
    world.command(p,d);if(p.dirty)persist(p);
   }catch(error){send(ws,{type:'error',message:['already_online','room_full','account_missing','save_unavailable'].includes(error.message)?error.message:'invalid_request'});if(!p||error.message==='save_unavailable')ws.close(1008);}
  });
  ws.on('close',()=>{clearTimeout(timer);connections.delete(ws);if(p){try{persist(p);}catch{}world.players.delete(p.id);}});ws.player=()=>p;
 });
 let previous=Date.now();const ticker=setInterval(()=>{const now=Date.now();world.tick(Math.min(.2,(now-previous)/1000),now/1000);previous=now;for(const ws of connections){const p=ws.player();if(!p)continue;try{if(p.dirty)persist(p);send(ws,world.snapshot(p));}catch{send(ws,{type:'error',message:'save_unavailable'});ws.close(1011);}}},100);
 const heartbeat=setInterval(()=>{for(const ws of connections){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}for(const [ip,q] of limits)if(q.at(-1)<Date.now()-60000)limits.delete(ip);},20000);
 server.listen(port,host);const close=async()=>{clearInterval(ticker);clearInterval(heartbeat);for(const ws of connections)ws.terminate();await new Promise(ok=>server.close(ok));};return {server,world,close};
}


