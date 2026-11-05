import WebSocket from 'ws';
import assert from 'node:assert/strict';
const url=process.env.COCKRO_TEST_URL||'wss://game.guardscan.xyz/online/world';
const origin='https://cockro-game-updates.vercel.app';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn,ms=10000){const until=Date.now()+ms;while(Date.now()<until){const v=fn();if(v)return v;await pause(80);}throw Error('Timed out waiting for game state');}
async function connect(token){const c={state:null,token,seq:0};c.ws=new WebSocket(url,{origin});c.ws.on('error',()=>{});c.ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='welcome'){c.token=m.token||token;c.id=m.id;c.save=m.save;}if(m.type==='state')c.state=m;if(m.type==='error')c.error=m.message;});await new Promise((ok,no)=>{c.ws.once('open',ok);c.ws.once('error',no);});c.send=d=>c.ws.send(JSON.stringify(d));c.send({type:'hello',version:'cockro-online-4',create:!token,name:'PatchTester',token,hero:'sword-cockro'});await wait(()=>c.state||c.error);if(c.error)throw Error(c.error);return c;}
async function main(){
 const ws=new WebSocket(url,{origin});let timer=setTimeout(()=>{console.error('AUTH_GATE_SMOKE_TIMEOUT');ws.terminate();process.exitCode=1;},10000);
 ws.on('open',()=>ws.send(JSON.stringify({type:'hello',version:'cockro-online-4',create:true,name:'PatchTester',hero:'sword-cockro'})));
 ws.on('message',raw=>{try{const d=JSON.parse(raw);assert.equal(d.type,'error');assert.equal(d.message,'login_required');console.log('PASS production rejects anonymous character creation');console.log('ONLINE_SMOKE_OK');}catch(e){console.error(e);process.exitCode=1;}finally{clearTimeout(timer);ws.close();}});
 ws.on('error',e=>{clearTimeout(timer);console.error(e.message);process.exitCode=1;});
}
main();
