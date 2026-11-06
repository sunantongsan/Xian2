import {chromium} from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),errors=[];
const server=http.createServer((req,res)=>{try{const f=path.join(root,'web',req.url==='/'?'index.html':req.url);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.COCKRO_CHROMIUM||undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/game.js',async route=>{const source=fs.readFileSync(root+'/web/game.js','utf8').replace('boot();',`window.qa={init(){s=fresh('sword-cockro');s.name='ฮีโร่ทดสอบ';s.gold=500000;p={x:0,y:0,hp:100,mp:100,face:1,anim:'idle'};town=true;onlineMode=true;net.ready=true;net.chatEnabled=true;net.selfId='self';net.billingOwner='qa';net.send=d=>{window.lastCommand=d;return true;};$('loading').hidden=true;$('hud').hidden=false;},chatUI,net,close,onlineInventory,statMenu,shop,openCommerce};`);await route.fulfill({contentType:'text/javascript',body:source});});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.qa);await page.evaluate(()=>qa.init());fs.mkdirSync('review',{recursive:true});
 async function bounds(selector){return page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,overflow:el.scrollWidth>el.clientWidth+1};});}
 for(const [name,width,height] of [['small',360,640],['portrait',390,844],['landscape',844,390],['keyboard',360,320],['landscape-keyboard',844,220]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>qa.chatUI.open());await page.waitForTimeout(60);
  await page.evaluate(()=>{for(let i=0;i<15;i++)qa.net.onChat({id:'row'+i,channel:i%2?'world':'map',from:'friend',name:'เพื่อนนักรบ',text:i%2?'มีใครไปล่ามอนสเตอร์ด้วยกันไหมครับ':'ไปด้วยครับ รอที่ร้านหุ่นยนต์นะ'});});
  await page.locator('#chatInput').fill('กำลังพิมพ์ข้อความ');await page.evaluate(()=>qa.net.onChat({id:'arriving'+innerWidth+innerHeight,channel:'world',from:'other',name:'แมลงจิ๋ว',text:'<img src=x onerror="alert(1)">'}));
  assert.equal(await page.locator('#chatInput').inputValue(),'กำลังพิมพ์ข้อความ');assert.equal(await page.locator('#chatLog img').count(),0);
  for(const id of ['#modal','#chatForm']){const r=await bounds(id);assert.ok(r.top>=0&&r.bottom<=height+1&&r.left>=0&&r.right<=width+1&&!r.overflow,`${name} ${id}: ${JSON.stringify(r)}`);}
  await page.screenshot({path:`review/chat-${name}.png`});
 }
 await page.setViewportSize({width:360,height:640});await page.waitForTimeout(60);
 await page.locator('#chatSend').click();assert.equal((await page.evaluate(()=>lastCommand)).text,'กำลังพิมพ์ข้อความ');
 await page.locator('#chatInput').fill('ข้อความถัดไป');await page.evaluate(()=>qa.net.onChat({id:'ack',channel:'world',from:'self',name:'เรา',text:'กำลังพิมพ์ข้อความ'}));assert.equal(await page.locator('#chatInput').inputValue(),'ข้อความถัดไป');
 await page.locator('.chat-name').filter({hasText:'เพื่อนนักรบ'}).first().click();assert.equal(await page.locator('#chatTo').inputValue(),'เพื่อนนักรบ');
 await page.locator('#chatSend').click();assert.equal((await page.evaluate(()=>lastCommand)).to,'friend');assert.equal((await page.evaluate(()=>lastCommand)).channel,'whisper');
 await page.evaluate(()=>qa.net.onChatError('player_offline'));assert.equal(await page.locator('#chatInput').inputValue(),'ข้อความถัดไป');
 await page.locator('#chatMute').click();await page.locator('#chatMinimize').click();await page.evaluate(()=>qa.net.onChat({id:'muted',channel:'world',from:'friend',name:'เพื่อนนักรบ',text:'hidden'}));assert.equal(await page.locator('#chatUnread').isVisible(),false);
 await page.evaluate(()=>qa.net.onChat({id:'unread',channel:'world',from:'other',name:'แมลงจิ๋ว',text:'hello'}));assert.equal(await page.locator('#chatUnread').textContent(),'1');
 await page.locator('#chatToggle').click();assert.equal(await page.locator('#chatUnread').isVisible(),false);assert.equal(await page.locator('#chatInput').inputValue(),'ข้อความถัดไป');
 await page.locator('#chatUnmute').click();await page.locator('[data-chat-channel="world"]').click();assert.ok(await page.locator('.chat-name').filter({hasText:'เพื่อนนักรบ'}).count());
 for(const [width,height] of [[360,640],[844,390]]){await page.setViewportSize({width,height});await page.evaluate(()=>qa.onlineInventory());await page.waitForTimeout(60);assert.equal((await bounds('#modal')).overflow,false);await page.screenshot({path:`review/bag-mobile-${width}.png`});}
 await page.evaluate(()=>{qa.chatUI.reset();qa.chatUI.open();});assert.equal(await page.locator('.chat-row').count(),0);assert.equal(await page.locator('#chatInput').inputValue(),'');
 assert.deepEqual(errors,[]);console.log('Chat mobile QA: 4 viewports, safe text, drafts, whisper, mute, unread, reset and bag passed');
}finally{await browser.close();server.close();}
