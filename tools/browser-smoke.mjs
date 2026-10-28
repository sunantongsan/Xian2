import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const server=spawn('python3',['-m','http.server','8990','--directory','web'],{stdio:'ignore'});
let browser;
try{
 for(let i=0;i<50;i++){try{await fetch('http://127.0.0.1:8990');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1}),errors=[],bad=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
 await page.goto('http://127.0.0.1:8990');await page.locator('#choose').click();await page.locator('#pick-sword-cockro').click();await page.locator('#modal').waitFor({state:'hidden'});
 await page.waitForFunction(()=>document.querySelector('#zoneName').textContent.includes('ออโรรา'));assert.match(await page.locator('#zoneName').innerText(),/ออโรรา/);fs.mkdirSync('review/browser',{recursive:true});await page.screenshot({path:'review/browser/village.png'});
 await page.locator('#mapShortcut').click();assert.equal(await page.locator('[id^="region-"]').count(),6);assert(await page.locator('#region-5').isDisabled());await page.screenshot({path:'review/browser/world-menu.png'});
 await page.locator('#paintedForest').click();await page.locator('#modal').waitFor({state:'hidden'});await page.waitForFunction(()=>document.querySelector('#zoneName').textContent.includes('1–10'));assert.match(await page.locator('#zoneName').innerText(),/1–10/);
 await page.keyboard.down('w');await page.waitForTimeout(800);await page.keyboard.up('w');await page.screenshot({path:'review/browser/forest.png'});
 await page.locator('#townBtn').click();await page.locator('#modal').waitFor({state:'hidden'});await page.waitForTimeout(150);await page.waitForFunction(()=>document.querySelector('#zoneName').textContent.includes('ออโรรา'));assert.match(await page.locator('#zoneName').innerText(),/ออโรรา/);
 await page.reload();await page.locator('#continue').click();await page.locator('#modal').waitFor({state:'hidden'});await page.waitForFunction(()=>document.querySelector('#heroName').textContent.includes('แมงสาบแมน'));assert.match(await page.locator('#heroName').innerText(),/แมงสาบแมน/);
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log('PASS: mobile viewport, create hero, village, six checkpoints, forest travel, movement, return and save reload; no JS errors or missing assets.');
}finally{if(browser)await browser.close();server.kill();}
