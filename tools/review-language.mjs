import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const server=spawn('python3',['-m','http.server','8092','--directory','web'],{stdio:'ignore'});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:["--no-zygote","--single-process"]});
mkdirSync('review',{recursive:true});
try {
 const page=await browser.newPage({viewport:{width:800,height:360}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/game.js',route=>route.fulfill({contentType:'text/javascript',body:readFileSync('web/game.js','utf8').replace('boot();','')+`\nglobalThis.languageQA={language,settings,menu,shop,checkinMenu,skillMenu,help,net,refreshStaticLanguage,setup(){s=fresh('sword-cockro');s.name='ไทย Test';p={x:0,y:0,hp:100,mp:100};town=true;onlineMode=true;net.ready=true;net.send=d=>{if(d.type==='language')queueMicrotask(()=>net.onLanguageResult?.({ok:true,requestId:d.requestId}));return true;};}};`}));
 await page.goto('http://127.0.0.1:8092');await page.waitForFunction(()=>globalThis.languageQA);await page.evaluate(()=>{languageQA.setup();languageQA.language.choose('th');languageQA.settings();});
 assert.match(await page.locator('#modalContent').innerText(),/ตั้งค่า/);
 await page.selectOption('#gameLanguage','en');await page.waitForFunction(()=>document.documentElement.lang==='en');
 assert.match(await page.locator('#modalContent').innerText(),/Settings/);assert.equal(await page.locator('.text-settings img').count(),0);
 for(const [w,h] of [[800,360],[640,320],[360,640]]) {await page.setViewportSize({width:w,height:h});for(const screen of ['settings','menu','shop','checkinMenu','skillMenu','help']){
 await page.evaluate(screen=>languageQA[screen](),screen);const content=await page.locator('#modalContent').innerText();assert(!/[\u0e00-\u0e7f]/.test(content.replaceAll('ไทย Test','').replaceAll('ไทย','')),screen+': '+content);
 const box=await page.locator('#modal').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));assert(box.scroll<=box.client+2,screen+' horizontal overflow');
 await page.screenshot({path:`review/language-en-${screen}-${w}.png`});
 }}
 await page.evaluate(()=>languageQA.settings());await page.selectOption('#gameLanguage','th');await page.waitForFunction(()=>document.documentElement.lang==='th');assert.match(await page.locator('#modalContent').innerText(),/ตั้งค่า/);
 await page.evaluate(()=>{languageQA.net.send=()=>false;});await page.selectOption('#gameLanguage','en');assert.equal(await page.evaluate(()=>languageQA.language.current),'th');assert.match(await page.locator('#languageStatus').innerText(),/ไม่สำเร็จ/);
 assert.deepEqual(errors,[]);console.log('Thai/English switch, failed save, text settings and six screens passed at three phone sizes.');
} finally {await browser.close();server.kill();}
