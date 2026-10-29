import http from 'node:http';
import {WebSocketServer} from 'ws';
import {createHash,randomBytes} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,renameSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {World,HEROES,PROTOCOL} from './world.js';
import {fresh} from '../web/core.js';
export function startServer({port=8091,host='127.0.0.1',directory='./online-data',test=false}={}){
 mkdirSync(directory,{recursive:true,mode:0o700});const world=new World(),connections=new Set(),limits=new Map();let diskFailure=false;
 function allow(ip){const now=Date.now();let q=(limits.get(ip)||[]).filter(t=>t>now-60000);if(q.length>=30)return false;q.push(now);limits.set(ip,q);return true;}
 const persist=p=>{try{const path=join(directory,p.id+'.json');writeFileSync(path+'.tmp',JSON.stringify(p.s),{mode:0o600});renameSync(path+'.tmp',path);p.dirty=false;}catch{diskFailure=true;throw Error('save_unavailable');}};
 const server=http.createServer((req,res)=>{if(req.url==='/online/health'){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.writeHead(diskFailure?503:200);res.end(JSON.stringify({ok:!diskFailure,version:PROTOCOL,release:'4.9.0',advancedSpecies:20,players:world.players.size,capacity:12}));}else{res.writeHead(404);res.end();}});
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
 server.on('upgrade',(req,socket,head)=>{const origin=req.headers.origin;const validOrigin=origin==='https://appassets.androidplatform.net'||origin==='https://cockro-game-updates.vercel.app'||/^https:\/\/cockro-game-updates-[a-z0-9-]+\.vercel\.app$/.test(origin||'')||test&&/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin||'');const ip=req.socket.remoteAddress==='127.0.0.1'?(req.headers['x-real-ip']||req.socket.remoteAddress):req.socket.remoteAddress;if(req.url!=='/online/world'||!validOrigin||connections.size>=24||!allow(ip)){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));});
 const send=(ws,data)=>{if(ws.readyState===1&&ws.bufferedAmount<262144)ws.send(JSON.stringify(data));else ws.close(1013,'slow_connection');};
 wss.on('connection',ws=>{connections.add(ws);let p=null,count=0,since=Date.now();const timer=setTimeout(()=>ws.close(1008,'handshake_timeout'),6000);ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.on('error',()=>{});
  ws.on('message',raw=>{try{const now=Date.now();if(now-since>=1000){count=0;since=now;}if(++count>35)throw Error('rate_limit');const d=JSON.parse(raw);if(!d||Array.isArray(d)||typeof d!=='object')throw Error('invalid_message');if(!p){if(d.type!=='hello'||d.version!==PROTOCOL)throw Error('version_mismatch');let token=d.token;let created=false;if(d.create===true&&!token){if(!HEROES.includes(d.hero))throw Error('invalid_hero');if(readdirSync(directory).filter(n=>n.endsWith('.json')).length>=5000)throw Error('account_capacity');token=randomBytes(32).toString('hex');created=true;}if(typeof token!=='string'||!/^\w{64}$/.test(token))throw Error('invalid_token');const id=createHash('sha256').update(token).digest('hex');const path=join(directory,id+'.json');if(!created&&!existsSync(path))throw Error('account_missing');const state=created?fresh(d.hero):JSON.parse(readFileSync(path,'utf8'));p=world.join(id,state);if(created)persist(p);clearTimeout(timer);send(ws,{type:'welcome',id,token:created?token:undefined,save:state});send(ws,world.snapshot(p));return;}
    world.command(p,d);if(p.dirty)persist(p);
   }catch(error){send(ws,{type:'error',message:['already_online','room_full','account_missing','save_unavailable'].includes(error.message)?error.message:'invalid_request'});if(!p||error.message==='save_unavailable')ws.close(1008);}
  });
  ws.on('close',()=>{clearTimeout(timer);connections.delete(ws);if(p){try{persist(p);}catch{}world.players.delete(p.id);}});ws.player=()=>p;
 });
 let previous=Date.now();const ticker=setInterval(()=>{const now=Date.now();world.tick(Math.min(.2,(now-previous)/1000),now/1000);previous=now;for(const ws of connections){const p=ws.player();if(!p)continue;try{if(p.dirty)persist(p);send(ws,world.snapshot(p));}catch{send(ws,{type:'error',message:'save_unavailable'});ws.close(1011);}}},100);
 const heartbeat=setInterval(()=>{for(const ws of connections){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}for(const [ip,q] of limits)if(q.at(-1)<Date.now()-60000)limits.delete(ip);},20000);
 server.listen(port,host);const close=async()=>{clearInterval(ticker);clearInterval(heartbeat);for(const ws of connections)ws.terminate();await new Promise(ok=>server.close(ok));};return {server,world,close};
}
