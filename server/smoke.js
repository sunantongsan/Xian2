import WebSocket from 'ws';
import assert from 'node:assert/strict';
const url=process.env.COCKRO_TEST_URL||'wss://game.guardscan.xyz/online/world';
const origin='https://cockro-game-updates.vercel.app';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn,ms=10000){const until=Date.now()+ms;while(Date.now()<until){const v=fn();if(v)return v;await pause(80);}throw Error('Timed out waiting for game state');}
async function connect(token){const c={state:null,token,seq:0};c.ws=new WebSocket(url,{origin});c.ws.on('error',()=>{});c.ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='welcome'){c.token=m.token||token;c.id=m.id;c.save=m.save;}if(m.type==='state')c.state=m;if(m.type==='error')c.error=m.message;});await new Promise((ok,no)=>{c.ws.once('open',ok);c.ws.once('error',no);});c.send=d=>c.ws.send(JSON.stringify(d));c.send({type:'hello',version:'cockro-online-2',create:!token,token,hero:'sword-cockro'});await wait(()=>c.state||c.error);if(c.error)throw Error(c.error);return c;}
async function main(){
let a,b,again;
try{
 a=await connect();b=await connect();assert.equal(a.state.self.save.equipped.length,5);for(const id of ['meteor','crystal','glowstone','diamond','ruby'])assert.equal(a.state.self.save.upgradeItems[id],0);console.log('PASS five skill slots and upgrade inventory synchronized');const initialGold=a.state.self.save.stones;a.send({type:'op',op:'dailyCheckin'});await wait(()=>a.state.self.save.stones===initialGold+3);await pause(150);a.send({type:'op',op:'dailyCheckin'});await pause(200);assert.equal(a.state.self.save.stones,initialGold+3);console.log('PASS daily check-in grants rare gold once');await wait(()=>a.state.players.some(p=>p.id===b.id)&&b.state.players.some(p=>p.id===a.id));console.log('PASS two players join the same village');
 const start=a.state.self.x;for(let i=0;i<6;i++){await pause(120);a.send({type:'move',x:a.state.self.x+15,y:a.state.self.y,seq:++a.seq});}
 await wait(()=>b.state.players.some(p=>p.id===a.id&&p.x>start+20));console.log('PASS remote player movement is synchronized');
 a.send({type:'op',op:'fashionWear',id:'cowboy-hat'});await wait(()=>a.state.self.save.fashion?.equipped.hat==='cowboy-hat'&&b.state.players.some(p=>p.id===a.id&&p.appearance?.hat==='cowboy-hat'));console.log('PASS equipped fashion is visible to another player');await pause(150);
 const money=a.state.self.save.gold,rare=a.state.self.save.stones,mpBefore=a.state.self.save.mpPotions;assert(Number.isInteger(mpBefore));a.send({type:'op',op:'buyMP'});await wait(()=>a.state.self.save.mpPotions===mpBefore+1);assert.equal(a.state.self.save.gold,money-60);assert.equal(a.state.self.save.stones,rare);console.log('PASS MP potion costs 60 G without spending rare gold');await pause(150);
 const before=a.state.self.save.potions;a.send({type:'op',op:'buy'});await wait(()=>a.state.self.save.potions===before+1);a.send({type:'save',save:{gold:999999999,level:210}});await pause(200);assert.equal(a.state.self.save.level,1);console.log('PASS server-owned progress rejects forged save');
 const token=a.token;a.ws.close();await pause(700);again=await connect(token);assert.equal(again.state.self.save.potions,before+1);assert.equal(again.state.self.save.mpPotions,mpBefore+1);assert.equal(again.state.self.save.stones,rare);assert.equal(again.state.self.save.fashion.equipped.hat,'cowboy-hat');console.log('PASS character progress persists after reconnect');
 again.send({type:'enter',map:'forest',gate:0});b.send({type:'enter',map:'forest',gate:0});await wait(()=>again.state.self.map==='forest'&&b.state.self.map==='forest');await wait(()=>again.state.monsters.length&&b.state.monsters.length);const m=again.state.monsters[0],other=b.state.monsters.find(x=>x.id===m.id);assert.ok(other);assert.equal(m.hp,other.hp);console.log('PASS players receive the same monster identities and HP');
 console.log('ONLINE_SMOKE_OK');
}catch(error){console.error('ONLINE_SMOKE_FAILED',error.message);process.exitCode=1;}finally{a?.ws.close();b?.ws.close();again?.ws.close();setTimeout(()=>process.exit(process.exitCode||0),500);}

}
main();


