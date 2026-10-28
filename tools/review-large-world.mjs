import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const server=spawn('python3',['-m','http.server','8991','--directory','web'],{stdio:'ignore'});
let browser;
try{
 for(let i=0;i<50;i++){try{await fetch('http://127.0.0.1:8991');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Test-only introspection is appended by interception, never shipped in the app.
 await page.route('**/game.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+`\nwindow.reviewGame={travel,skill,update,draw,place(uv){Object.assign(p,toWorld(uv,scene));p.hp=100000;p.inv=1000;},setup(){s.level=60;s.equipped=['s1','s2','s3'];p.mp=1000;},state(){return {count:enemies.length,width:scene.width,height:scene.height,player:{x:p.x,y:p.y},alive:enemies.filter(e=>e.hp>0).length}},freeze(){paused=true;},resume(){paused=false;}};`});});
 await page.goto('http://127.0.0.1:8991');await page.locator('#choose').click();await page.locator('#pick-sword-cockro').click();await page.locator('#modal').waitFor({state:'hidden'});
 await page.evaluate(async()=>{await reviewGame.travel(0,false);reviewGame.setup();});
 assert.equal((await page.evaluate(()=>reviewGame.state())).count,978);
 // A real key press must traverse world coordinates rather than pan a static image.
 const before=await page.evaluate(()=>reviewGame.state().player);await page.keyboard.down('s');await page.waitForTimeout(1000);await page.keyboard.up('s');
 const after=await page.evaluate(()=>reviewGame.state().player);assert(Math.hypot(after.x-before.x,after.y-before.y)>20);
 const images=[];fs.mkdirSync('review/browser',{recursive:true});
 for(const [slot,name] of [[0,'wave'],[1,'whirlwind'],[2,'sword-rain']]){
  await page.evaluate(async slot=>{await reviewGame.travel(0,false);reviewGame.setup();reviewGame.place([1.5/9,5.53/6]);reviewGame.skill(slot);},slot);
  await page.waitForTimeout(500);await page.evaluate(()=>reviewGame.freeze());
  const image=await page.screenshot({type:'jpeg',quality:72});images.push({name,base64:image.toString('base64')});
 }
 await page.evaluate(()=>reviewGame.resume());
 const timings=await page.evaluate(()=>{const values=[];for(let i=0;i<120;i++){const start=performance.now();reviewGame.update(1/60);reviewGame.draw();values.push(performance.now()-start);}values.sort((a,b)=>a-b);return {median:values[60],p95:values[114]};});
 await page.mouse.click(480,80);await page.locator('#modal').waitFor({state:'visible'});assert.equal(await page.locator('[id^="region-"]').count(),6);
 assert.deepEqual(errors,[]);fs.writeFileSync('review/large-world-preview.json',JSON.stringify({timings,images}));
 console.log('PASS: 978 population, actual walking, three skill renders, no browser exceptions; desktop headless render timing',timings);
}finally{if(browser)await browser.close();server.kill();}
