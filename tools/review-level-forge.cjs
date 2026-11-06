const {chromium}=require('playwright');
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:800,height:360}});
await page.goto('http://127.0.0.1:8765/forge-result.js');
await page.setContent('<link rel="stylesheet" href="http://127.0.0.1:8765/style.css"><dialog id="modal"><button id="windowClose">×</button><div id="modalContent"></div></dialog><canvas id="fx" width="800" height="360"></canvas>');
await page.evaluate(async()=>{window.result=(await import('/forge-result.js')).forgeResultHTML;window.aura=(await import('/progression-ui.js')).drawLevelAura;});
for(const [w,h]of [[800,360],[640,320],[360,640]]){await page.setViewportSize({width:w,height:h});for(const success of [true,false]){
 await page.evaluate(success=>{document.querySelector('#modalContent').innerHTML=window.result({success,icon:'⚔',name:'ดาบฮีโร่แมงสาบ +9',plus:9,stats:'โจมตี +1,250 • คริติคอล +15% • ฟื้น HP +25%',message:'ตีบวกไม่สำเร็จ • อุปกรณ์ไม่หาย • โอกาสครั้งหน้าเพิ่มขึ้น'});document.querySelector('dialog').showModal();},success);
 await page.waitForTimeout(120);
 const fit=await page.evaluate(()=>{const d=document.querySelector('dialog'),b=document.querySelector('#forgeContinue').getBoundingClientRect();return{fits:d.scrollHeight<=d.clientHeight+1,button:b.bottom<=innerHeight&&b.top>=0,h:d.getBoundingClientRect().height};});if(!fit.fits||!fit.button)throw Error(JSON.stringify({w,h,success,fit}));
 if(w===800)await page.screenshot({path:'/tmp/forge-'+(success?'success':'failure')+'.png'});
}}
await page.evaluate(()=>{document.querySelector('dialog').close();const g=document.querySelector('canvas').getContext('2d');g.fillStyle='#0b1d2b';g.fillRect(0,0,800,360);for(let i=0;i<3;i++){const x=140+i*260;g.fillStyle='#385368';g.fillRect(x-16,180,32,70);window.aura(g,x,270,1,[.12,.4,.75][i]);}});await page.setViewportSize({width:800,height:360});await page.screenshot({path:'/tmp/level-effect.png'});
console.log('Forge success/failure fits all 3 viewports without scrolling; aura rendered at 3 phases');await browser.close();})();
