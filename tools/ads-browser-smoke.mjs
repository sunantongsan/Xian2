import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn('python3',['-m','http.server','8993','--directory','web'],{stdio:'ignore'});let browser;
try{
 for(let i=0;i<50;i++){try{await fetch('http://127.0.0.1:8993');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:844,height:390}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.adCalls=[];window.CockroAds={postMessage:raw=>{const data=JSON.parse(raw);window.adCalls.push(data);setTimeout(()=>window.dispatchEvent(new CustomEvent('cockro-ad',{detail:{ready:true,test:true,privacy:true,status:data.type==='show'?'test-earned':'status'}})),0);}};});
 await page.goto('http://127.0.0.1:8993');await page.locator('#choose').click();await page.locator('#pick-sword-cockro').click();await page.locator('#modal').waitFor({state:'hidden'});await page.locator('#shopShortcut').click();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('road-to-immortality-v1')).upgradeItems);
 await page.locator('[data-reward-item="ruby"]').click();await page.waitForFunction(()=>window.adCalls.some(d=>d.type==='show'));
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('road-to-immortality-v1')).upgradeItems),before);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('cockro-ad',{detail:{ready:true,test:false,privacy:true,status:'status'}})));
 for(const b of await page.locator('[data-reward-item]').all())assert(await b.isDisabled(),'real rewards disabled in offline mode');
 assert.deepEqual(errors,[]);console.log('ADS_BRIDGE_UI_NO_LOCAL_GRANT_OK');
}finally{await browser?.close();server.kill();}
