import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const server=spawn('python3',['-m','http.server','8991','--directory','web'],{stdio:'ignore'});
let browser;
try{
 for(let i=0;i<50;i++){try{await fetch('http://127.0.0.1:8991');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:844,height:390}}),errors=[],bad=[];page.setDefaultTimeout(20000);
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});page.on('response',r=>{if(r.status()>=400){bad.push(r.url());console.log('HTTPERROR',r.url())}});
 await page.goto('http://127.0.0.1:8991');console.log('loaded');await page.locator('#choose').click();console.log('choose');await page.locator('#pick-sword-cockro').click();await page.locator('#modal').waitFor({state:'hidden'});console.log('started');
 for(const id of ['hpText','mpText','xpText','money'])console.log(id,await page.locator('#'+id).innerText());
 assert.match(await page.locator('#money').innerText(),/G • ทอง/);assert.match(await page.locator('#mpText').innerText(),/^MP/);
 const bounds=await page.locator('#mpPotionBtn').boundingBox();assert(bounds&&bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=844&&bounds.y+bounds.height<=390);
 fs.mkdirSync('review/release',{recursive:true});await page.screenshot({path:'review/release/hud.png'});
 await page.locator('#quickMenuToggle').click();await page.locator('#menuBtn').click();await page.locator('#shop').click();assert.match(await page.locator('#buyMP').innerText(),/60 G/);await page.locator('#buyMP').click();const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('road-to-immortality-v1')));assert.equal(save.mpPotions,6);assert.equal(save.gold,99940);assert.equal(save.stones,0);await page.screenshot({path:'review/release/shop.png'});console.log('shop verified');
 await page.locator('#return').click();await page.locator('#forge').click();assert.match(await page.locator('#modalContent').innerText(),/ทอง 0/);assert(await page.locator('[data-forge]').first().isDisabled());await page.screenshot({path:'review/release/forge.png'});await page.locator('#return').click();await page.locator('#resume').click();
 await page.reload();await page.locator('#continue').click();await page.locator('#modal').waitFor({state:'hidden'});await page.waitForFunction(()=>document.querySelector('#mpPotionBtn').textContent==='MP 6');assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log('MOBILE_RELEASE_SMOKE_OK');
}finally{if(browser)await browser.close();server.kill();}
