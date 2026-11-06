import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const server=spawn('python3',['-m','http.server','8992','--directory','web'],{stdio:'ignore'});
let browser;
try{
 for(let i=0;i<50;i++){try{await fetch('http://127.0.0.1:8992');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:844,height:390}}),errors=[],bad=[];page.setDefaultTimeout(20000);
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});page.on('response',r=>{if(r.status()>=400){bad.push(r.url());console.log('HTTPERROR',r.url())}});
 await page.goto('http://127.0.0.1:8992');console.log('loaded');await page.locator('#choose').click();console.log('choose');await page.locator('#pick-sword-cockro').click();await page.locator('#modal').waitFor({state:'hidden'});console.log('started');

 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('road-to-immortality-v1')));saved.level=60;saved.equipped=['s1','s2','s3'];saved.stones=500;
 await page.addInitScript(s=>{if(!sessionStorage.getItem('items-fixture')){localStorage.setItem('road-to-immortality-v1',JSON.stringify(s));sessionStorage.setItem('items-fixture','1');}},saved);await page.reload();await page.locator('#continue').click();await page.waitForFunction(()=>document.querySelector('#skillBtn4').dataset.skill==='s5');
 const ids=['attackBtn','skillBtn','skillBtn1','skillBtn2','skillBtn3','skillBtn4','potionBtn','mpPotionBtn','dashBtn'];
 for(const width of [844,640]){await page.setViewportSize({width,height:390});const boxes=await Promise.all(ids.map(id=>page.locator('#'+id).boundingBox()));for(const box of boxes)assert(box&&box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=390);for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y),'overlap '+ids[i]+' '+ids[j]);}}
 await page.setViewportSize({width:844,height:390});fs.mkdirSync('review/items',{recursive:true});await page.screenshot({path:'review/items/hud-five.png'});
 await page.locator('#checkinShortcut').click();await page.locator('#claimDaily').click();assert(await page.locator('#claimDaily').isDisabled());await page.screenshot({path:'review/items/checkin.png'});await page.locator('#dailyClose').click();await page.locator('#shopShortcut').click();assert.equal(await page.locator('.upgrade-card').count(),5);for(const id of ['meteor','crystal','glowstone','diamond','ruby'])await page.locator('[data-buy-item][data-id="'+id+'"]').click();
 let state=await page.evaluate(()=>JSON.parse(localStorage.getItem('road-to-immortality-v1')));assert.equal(state.stones,313);assert.equal(state.gold,100000);for(const id of ['meteor','crystal','glowstone','diamond','ruby'])assert.equal(state.upgradeItems[id],1);assert.equal(await page.locator('.upgrade-card button[disabled]').count(),5);
 await page.locator('.upgrade-card').first().scrollIntoViewIfNeeded();await page.screenshot({path:'review/items/shop.png'});await page.locator('#return').click();await page.locator('#forge').click();await page.locator('[data-forge][data-slot="weapon"]').click();await page.locator('[data-gem][data-slot="weapon"][data-id="crystal"]').click();await page.locator('[data-gem][data-slot="armor"][data-id="ruby"]').click();
 state=await page.evaluate(()=>JSON.parse(localStorage.getItem('road-to-immortality-v1')));assert.equal(state.equip.weapon.plus,1);assert.equal(state.equip.weapon.gems.crystal,1);assert.equal(state.equip.armor.gems.ruby,1);assert.equal(state.upgradeItems.meteor,0);await page.locator('.forge-items').scrollIntoViewIfNeeded();await page.screenshot({path:'review/items/forge.png'});
 await page.reload();await page.locator('#continue').click();await page.waitForFunction(()=>document.querySelector('#skillBtn4').dataset.skill==='s5');await page.locator('#checkinShortcut').click();assert(await page.locator('#claimDaily').isDisabled());assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log('FIVE_SKILLS_ITEMS_MOBILE_OK');
}finally{if(browser)await browser.close();server.kill();}
