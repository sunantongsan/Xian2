import {chromium} from 'playwright';import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import assert from 'node:assert/strict';
const root=process.cwd(),errors=[];
const server=http.createServer((req,res)=>{try{const f=path.join(root,'web',req.url==='/'?'index.html':req.url);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.ttf':'font/ttf'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.route('**/game.js',async route=>{const source=fs.readFileSync('web/game.js','utf8').replace('boot();',`window.qa={async init(){s=fresh('sword-cockro');s.name='ฮีโร่แมงสาบ';s.level=20;s.statPoints=76;s.attributes={vit:6,str:12,int:4,agi:2};s.statPoints-=24;scene=MAPS.town;p={...toWorld(DOCTOR_UV,scene),hp:100,mp:100,face:1,anim:'idle'};town=true;onlineMode=true;net.ready=true;net.chatEnabled=true;net.selfId='self';net.billingOwner='qa';net.latestState={self:{id:'self'},stalls:[]};net.send=d=>{window.lastCommand=d;return true;};await Promise.all([loadImage(scene.image),loadImage('sprites/doctor-einstein-v2.webp'),loadImage('sprites/forge-master-v2.webp'),loadLayeredHero(s.hero,mutationVisualLevel(s)),loadImage('heroes/cockro-combat-v2.webp')]);await document.fonts.ready;$('loading').hidden=true;$('hud').hidden=false;$('controls').hidden=false;chatUI.mount();resize();hud();draw();},enterField(){town=false;scene=MAPS.forest;},setQuickMenu,goHome,project,npcPoints:()=>scene.pois.filter(q=>['mutation','forge'].includes(q.action)).map(q=>({...q,point:project(...Object.values(toWorld(q.uv,scene))),offset:100*scale})),statMenu,doctorMenu,celebrateProgress,progressionUI,state:()=>s,player:()=>p,close,resize,draw,hud,ui:update=>progressionUI.update(update)};`);await route.fulfill({contentType:'text/javascript',body:source});});
await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.qa);await page.evaluate(()=>qa.init());fs.mkdirSync('review',{recursive:true});
for(const [width,height]of [[844,390],[640,360],[390,844],[1536,709]]){
 await page.setViewportSize({width,height});await page.evaluate(()=>{qa.close();qa.resize();qa.hud();qa.draw();});
 assert(await page.locator('#mutationNotice').isVisible());
 await page.evaluate(()=>qa.setQuickMenu(true));
 const boxes=await page.evaluate(()=>Object.fromEntries(['mutationNotice','townBtn','quickMenuToggle','quickMenuTray','characterShortcut'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return[id,{x:r.x,y:r.y,right:r.right,bottom:r.bottom}]})));
 const overlaps=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
 for(const id of ['townBtn','quickMenuToggle','quickMenuTray','characterShortcut'])assert(!overlaps(boxes.mutationNotice,boxes[id]),'notice overlaps '+id+' at '+width);
 assert(boxes.townBtn.y>=boxes.characterShortcut.bottom);assert(Math.abs(boxes.townBtn.x-boxes.characterShortcut.x)<2);
 for(const id of ['townBtn','quickMenuToggle'])assert(await page.locator('#'+id).evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),'button is clickable '+id);
 await page.evaluate(()=>{qa.setQuickMenu(false);window.originalPosition={x:qa.player().x,y:qa.player().y};qa.player().x+=90;qa.player().y+=90;qa.draw();});await page.screenshot({path:`review/cockro440-workshop-${width}.png`});await page.evaluate(()=>Object.assign(qa.player(),window.originalPosition));
 assert(await page.locator('#characterShortcut').evaluate(e=>e.classList.contains('mutation-ready')));
 if(width>=640){for(const npc of await page.evaluate(()=>qa.npcPoints())){await page.mouse.click(npc.point.x,npc.point.y-npc.offset);assert(await page.locator(npc.action==='mutation'?'.doctor-panel':'.forge-panel').isVisible(),'tap visible '+npc.action);await page.evaluate(()=>qa.close());}}
 await page.evaluate(()=>qa.statMenu('stats'));await page.waitForTimeout(250);
 assert.equal(await page.locator('.character-armory').count(),1);assert(await page.locator('#dollCanvas').isVisible());assert(await page.locator('#visitMutationDoctor').isVisible());
 assert(await page.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth+2),'no horizontal modal overflow');
 await page.screenshot({path:`review/cockro440-character-${width}.png`});
 await page.locator('[data-step="str"][data-delta="1"]').click();assert.equal(await page.locator('[data-stat="str"]').getAttribute('data-value'),'1');
 await page.locator('#statConfirm').click();assert.equal(await page.evaluate(()=>lastCommand.op),'allocateStats');assert.equal(await page.evaluate(()=>lastCommand.values.str),1);
 await page.evaluate(()=>{qa.close();qa.doctorMenu()});assert(await page.locator('#confirmMutation').isEnabled());assert(await page.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth+2),'doctor dialog fits width');assert(await page.locator('.doctor-panel>div').evaluate(e=>e.clientWidth>=170),'doctor text remains readable');await page.locator('#confirmMutation').click();assert.equal(await page.evaluate(()=>lastCommand.op),'mutate');
 await page.screenshot({path:`review/cockro440-doctor-${width}.png`});
 await page.evaluate(()=>{qa.close();qa.draw();qa.celebrateProgress();});await page.waitForTimeout(600);
 assert.match(await page.locator('#levelCelebration').innerText(),/ยินดีด้วยคุณเข้าสู่เลเวล 20/);
 await page.screenshot({path:`review/cockro440-levelup-${width}.png`});
 await page.evaluate(()=>{qa.progressionUI.hide();qa.ui(qa.state());});
}
await page.evaluate(()=>{qa.close();qa.enterField();window.lastCommand=null;});await page.locator('#townBtn').click();await page.waitForFunction(()=>window.lastCommand?.type==='enter'&&window.lastCommand.map==='town');assert.deepEqual(errors,[]);console.log('PASS 4.40: navigation accessible, home below status,  4 phone layouts, visible portrait, pending highlight, numeric allocation, doctor command and central level celebration');
}finally{await browser.close();server.close();}
