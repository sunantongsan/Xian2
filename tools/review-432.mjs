import {chromium} from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const server=http.createServer((req,res)=>{const f=path.join(root,'web',req.url==='/'?'index.html':req.url);try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.webp':'image/webp','.ttf':'font/ttf'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/game.js',async route=>{let source=fs.readFileSync(root+'/web/game.js','utf8').replace('boot();',`window.qa={init(){s=fresh('sword-cockro');s.name='COCKRO ฮีโร่';s.level=37;s.statPoints=120;s.gold=500000;s.stones=500;s.expTickets={x2:2,x5:1,x10:1};p={x:0,y:0,hp:maxHP(s),mp:100,face:1,anim:'idle',animTime:0};town=true;onlineMode=true;net.ready=true;net.send=d=>{window.lastCommand=d;return true;};$('loading').hidden=true;},statMenu,onlineInventory,shop};`);await route.fulfill({contentType:'text/javascript',body:source});});
await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.qa);await page.evaluate(()=>qa.init());
fs.mkdirSync(root+'/review',{recursive:true});
for(const [name,width,height] of [['portrait',390,844],['landscape',844,390],['small',360,640]]){
 await page.setViewportSize({width,height});await page.evaluate(()=>qa.statMenu('stats'));await page.screenshot({path:root+'/review/stats-'+name+'.png'});
 const bounds=await page.locator('#modal').evaluate(e=>({width:e.clientWidth,scroll:e.scrollHeight,height:e.clientHeight,horizontal:e.scrollWidth>e.clientWidth}));console.log(name,bounds);if(bounds.horizontal||bounds.scroll>bounds.height+1)throw Error('Stats require scrolling: '+name);
 await page.locator('[data-step="str"][data-delta="1"]').click();await page.locator('#statConfirm').click();if((await page.evaluate(()=>lastCommand.values.str))!==1)throw Error('stat allocation failed');
}
await page.evaluate(()=>qa.shop());await page.locator('[data-shop-tab="tickets"]').click();await page.screenshot({path:root+'/review/exp-shop.png'});await page.locator('[data-op="buyExpTicket"][data-id="x5"]').click();if((await page.evaluate(()=>lastCommand.id))!=='x5')throw Error('purchase missing');
await page.evaluate(()=>qa.onlineInventory());await page.locator('[data-inventory-key="ticket:x2"]').click();await page.locator('#inventoryUseTicket').click();await page.locator('#useTicketConfirm').click();if((await page.evaluate(()=>lastCommand.op))!=='useExpTicket')throw Error('use missing');
console.log({errors});if(errors.length)process.exitCode=1;await browser.close();server.close();
