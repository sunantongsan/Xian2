import {chromium} from 'playwright';
import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import assert from 'node:assert/strict';
const root=process.cwd(),errors=[];
const server=http.createServer((req,res)=>{try{const f=path.join(root,'web',req.url==='/'?'index.html':req.url);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.route('**/game.js',async route=>{const source=fs.readFileSync('web/game.js','utf8').replace('boot();',`window.qa={async init(){s=fresh('sword-cockro');s.name='ฮีโร่แมงสาบ';s.gold=500000;s.stones=500;scene=MAPS.town;p={...toWorld([.70,.54],scene),hp:100,mp:100,face:1,anim:'idle'};town=true;onlineMode=true;net.ready=true;net.chatEnabled=true;net.selfId='self';net.billingOwner='qa';net.latestState={self:{id:'self'},stalls:[]};net.send=d=>{window.lastCommand=d;return true;};await Promise.all([loadImage(scene.image),loadImage('heroes/cockro-combat-v2.webp')]);$('loading').hidden=true;$('hud').hidden=false;$('controls').hidden=false;chatUI.mount();resize();hud();draw();},showPickup,equipmentComparison,autoUsePotions,player:()=>p,state:()=>s,chatUI,net,close,setQuickMenu,openCommerce,resize,draw};`);await route.fulfill({contentType:'text/javascript',body:source});});
await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.qa);await page.evaluate(()=>qa.init());fs.mkdirSync('review',{recursive:true});
await page.evaluate(()=>{
 const s=qa.state(),p=qa.player(),atStart=s.equip.weapon;
 const better={...atStart,plus:9},locked={...atStart,tier:2};
 if(!qa.equipmentComparison(better).includes('โจมตี')||!qa.equipmentComparison(better).includes('โจมตี +')||!qa.equipmentComparison(locked).includes('ต้องการ Lv.')||s.equip.weapon!==atStart)throw Error('gear preview');
 qa.showPickup({kind:'gold',count:2});qa.showPickup({kind:'gold',count:7});
 if(!document.querySelector('#pickupFeed').textContent.includes('×9'))throw Error('pickup aggregation');
 p.hp=1;p.mp=1;s.autoAttack=false;window.lastCommand=null;qa.autoUsePotions();
 if(window.lastCommand)throw Error('auto off used potion');
 const sent=[];const send=qa.net.send;qa.net.send=cmd=>sent.push(cmd.type);s.autoAttack=true;qa.autoUsePotions();qa.autoUsePotions();
 if(sent.join(',')!=='potion,mpPotion')throw Error('auto potion cadence: '+sent);
 s.autoAttack=false;qa.net.send=send;p.hp=100;p.mp=80;
});
for(const [width,height]of [[844,390],[640,360],[390,844]]){
 await page.setViewportSize({width,height});await page.evaluate(()=>{qa.resize();qa.draw();qa.setQuickMenu(true)});await page.waitForTimeout(250);
 const rect=id=>page.locator(id).evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}});
 const tray=await rect('#quickMenuTray'),trigger=await rect('#quickMenuToggle'),skill=await rect('.combat');assert(tray.y>=0&&tray.x>=0&&tray.right<=width+1);assert(tray.y>=trigger.bottom);
 const joy=await rect('#joystick'),card=await rect('.sector-card'),hero=await rect('#characterShortcut');
 assert(tray.bottom<=joy.y+1,'left controls must clear the joystick');
 assert(Math.abs((card.right-card.x)-(hero.right-hero.x))<=1&&Math.abs(card.bottom-hero.bottom)<=1,'HUD cards must match');assert(tray.bottom<=skill.y||tray.right<=skill.x);const dock=await rect('#chatDock');assert(dock.x>=0&&dock.right<=width+1&&dock.bottom<=height+1);
 await page.evaluate(()=>{qa.net.onChat({id:'hello'+innerWidth,channel:'world',from:'self',name:'ฮีโร่แมงสาบ',text:'พร้อมอัปเกรดอาวุธ ไปผจญภัยกัน!'});const g=document.getElementById('game').getContext('2d');qa.chatUI.drawBubbles(g,()=>({x:innerWidth*.5,y:innerHeight*.5-70}));});
 await page.screenshot({path:`review/cockro-437-${width}.png`});
 await page.evaluate(()=>qa.setQuickMenu(false));await page.waitForTimeout(240);
 await page.evaluate(()=>qa.draw());
 await page.screenshot({path:`review/cockro-437-closed-${width}.png`});
}
await page.setViewportSize({width:844,height:390});await page.evaluate(()=>qa.setQuickMenu(false));await page.locator('#dockToggle').click();await page.locator('#dockInput').fill('สวัสดีเพื่อน');await page.locator('#dockForm').evaluate(f=>f.requestSubmit());assert.equal(await page.evaluate(()=>lastCommand.channel),'map');await page.evaluate(()=>qa.net.onChat({id:'ack',from:'self',name:'เรา',channel:'map',text:'สวัสดีเพื่อน'}));assert.equal(await page.locator('#dockInput').inputValue(),'');
await page.selectOption('#dockChannel','world');await page.locator('#dockInput').fill('<script>ไม่ใช่โค้ด</script>');await page.locator('#dockForm').evaluate(f=>f.requestSubmit());assert.equal(await page.evaluate(()=>lastCommand.channel),'world');await page.evaluate(()=>qa.net.onChatError('chat_rate_limit'));assert.equal(await page.locator('#dockInput').inputValue(),'<script>ไม่ใช่โค้ด</script>');
await page.locator('#quickMenuToggle').click();await page.locator('#inventoryShortcut').click();await page.locator('#inventoryGrid').waitFor();
await page.locator('#inventoryGrid [data-usable="true"]').first().click();
const totals=page.locator('#portraitTotals');
assert.match(await totals.innerText(),/ป้องกัน[\s\S]*2.45 → 3.95/);
assert.match(await page.locator('.gear-preview').innerText(),/ป้องกัน \+1.5.*HP \+28/);
assert(await page.evaluate(()=>!qa.state().equip.helm),'preview must not equip');
assert(await totals.evaluate(el=>el.getBoundingClientRect().bottom<=document.querySelector('.armory-stage').getBoundingClientRect().top+1),'totals above portrait');
await page.screenshot({path:'review/cockro-437-equipment.png'});
await page.evaluate(()=>qa.close());
await page.locator('#quickMenuToggle').click();await page.locator('#vaultShortcut').click();await page.evaluate(()=>qa.net.onCommerceResult({ok:true,revision:1,vaultSecurity:{supported:true,configured:false,locked:true},vault:null,ownShop:{open:false,listings:[]},shops:[]}));await page.fill('#vaultPin','123456');await page.fill('#vaultPinConfirm','123456');await page.locator('#vaultPinForm').evaluate(f=>f.requestSubmit());assert.equal(await page.evaluate(()=>lastCommand.action),'setVaultPin');
await page.evaluate(()=>qa.net.onCommerceResult({ok:true,revision:2,vaultSecurity:{supported:true,configured:true,locked:false},vault:{gold:0,stones:0,items:[]},ownShop:{open:false,listings:[]},shops:[]}));await page.fill('#vaultAmount','10');await page.click('#depositMoney');assert.equal(await page.evaluate(()=>lastCommand.amount),10);
assert.deepEqual(errors,[]);console.log('PASS: 3 phone sizes, upward menu clear of skills, dock send/ack/errors, inventory shortcut, PIN setup and deposit.');
}finally{await browser.close();server.close();}
