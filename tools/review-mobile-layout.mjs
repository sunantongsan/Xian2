import {chromium} from 'playwright';import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import assert from 'node:assert/strict';
const root=process.cwd(),errors=[];
const server=http.createServer((req,res)=>{try{const f=path.join(root,'web',req.url==='/'?'index.html':req.url);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.ttf':'font/ttf','.svg':'image/svg+xml'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--no-zygote','--single-process']});
try{const page=await browser.newPage({viewport:{width:768,height:354},deviceScaleFactor:2});page.on('pageerror',e=>errors.push(e.message));
await page.route('**/game.js',async route=>{const source=fs.readFileSync('web/game.js','utf8').replace('boot();',`window.qa={async init(){s=fresh('sword-cockro');s.name='ใครใหญ่';s.level=20;s.statPoints=76;s.mutationStage=1;s.attributes={vit:0,str:0,int:0,agi:0};scene=MAPS.town;p={...toWorld(DOCTOR_UV,scene),hp:100,mp:100,face:1,anim:'idle'};town=true;onlineMode=true;net.ready=true;net.adsEnabled=true;window.CockroAds={postMessage:()=>{}};ads.state.ready=true;ads.state.test=false;net.chatEnabled=true;net.selfId='self';net.billingOwner='qa';net.latestState={self:{id:'self'},stalls:[]};net.send=d=>{window.lastCommand=d;return true;};await Promise.all([loadImage(scene.image),loadImage('sprites/doctor-einstein-v2.webp'),loadImage('sprites/forge-master-v2.webp'),loadLayeredHero(s.hero,mutationVisualLevel(s)),loadImage('heroes/cockro-combat-v2.webp')]);await document.fonts.ready;$('loading').hidden=true;$('hud').hidden=false;$('controls').hidden=false;chatUI.mount();resize();hud();draw();},enterField(){town=false;scene=MAPS.forest;},setQuickMenu,goHome,project,npcPoints:()=>scene.pois.filter(q=>['mutation','forge'].includes(q.action)).map(q=>({...q,point:project(...Object.values(toWorld(q.uv,scene))),offset:100*scale})),async starTest(){await loadStar();await loadStarArt();scene=star;town=false;p.x=star.spawns.find(c=>c.level===96).x;p.y=star.spawns.find(c=>c.level===96).y;starRender=createStarRenderer(star,{quality:s.quality,art:starArt,images});resize();for(let i=0;i<30;i++)draw();},clearAd:()=>{adPending=false;},statMenu,forge,checkinMenu,doctorMenu,celebrateProgress,progressionUI,state:()=>s,player:()=>p,close,resize,draw,hud,ui:update=>progressionUI.update(update)};`);await route.fulfill({contentType:'text/javascript',body:source});});
await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.qa);await page.evaluate(()=>qa.init());fs.mkdirSync('review',{recursive:true});


for(const [w,h] of [[768,354],[800,360],[640,320],[960,432],[360,640]]){
 await page.setViewportSize({width:w,height:h});await page.evaluate(()=>{qa.close();qa.state().gold=8786803;qa.state().stones=48524;qa.hud();});
 await page.waitForTimeout(60);
 const hud=await page.locator('#characterShortcut').boundingBox();assert(hud.width<=150&&hud.height<120,JSON.stringify(hud));
 for(const lang of ['th','en']){
 await page.evaluate(async lang=>{const {language}=await import('/i18n.js');language.choose(lang);},lang);
 for(let repeat=0;repeat<2;repeat++){
 await page.evaluate(()=>qa.forge());
 for(const tab of ['upgrade','gem','special']){
 await page.locator(`[data-forge-tab="${tab}"]`).click();
 const fit=await page.evaluate(()=>{const d=document.querySelector('#modal'),f=document.querySelector('.forge-footer'),r=f.getBoundingClientRect(),m=d.getBoundingClientRect();return{w:innerWidth,h:innerHeight,modal:[m.left,m.top,m.right,m.bottom],footer:[r.top,r.bottom],overflow:d.scrollWidth>d.clientWidth+1,work:document.querySelector('.forge-workbench').clientHeight};});
 assert(!fit.overflow&&fit.modal[0]>=0&&fit.modal[2]<=w+1&&fit.modal[3]<=h+1&&fit.footer[1]<=fit.modal[3]&&fit.footer[0]>=fit.modal[1],JSON.stringify({tab,fit}));
 if(w===768&&tab==='gem'&&repeat===0&&lang==='th')await page.screenshot({path:'review/mobile-forge-4463.png'});
 }
 await page.evaluate(()=>qa.close());
 }
 }
 if(w===768)await page.screenshot({path:'review/mobile-hud-4463.png'});
}
assert.deepEqual(errors,[]);console.log('PASS HUD, forge tabs and repeated opening at 5 phone sizes');
}finally{await browser.close();server.close();}
