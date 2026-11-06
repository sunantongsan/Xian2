import {chromium} from '../../browser-tools/node_modules/playwright/index.mjs';
import {startServer} from '../server/server.js';
import {fresh,maxHP} from '../web/core.js';
import {knownSkills} from '../web/skills.js';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import WebSocket from 'ws';
import assert from 'node:assert/strict';
const dir=mkdtempSync(tmpdir()+'/pvp-skills-ui-'),tokens=['a'.repeat(64),'b'.repeat(64)],ids=tokens.map(t=>createHash('sha256').update(t).digest('hex'));
for(let i=0;i<2;i++){const s=fresh('sword-cockro');s.level=210;s.name=i?'QA Defender':'QA Attacker';s.equipped=knownSkills(s).slice(0,5).map(r=>r.id);s.attributes.vit=400;s.sound=true;writeFileSync(dir+'/'+ids[i]+'.json',JSON.stringify(s));}
const app=startServer({port:0,directory:dir,test:true});await once(app.server,'listening');const url=`ws://127.0.0.1:${app.server.address().port}/online/world`;
const dummy=new WebSocket(url,{origin:'http://localhost:8998'});await once(dummy,'open');dummy.send(JSON.stringify({type:'hello',version:'cockro-online-2',token:tokens[1]}));await once(dummy,'message');const defender=app.world.getActor(ids[1]);defender.x+=60;
const emitted=[],event=app.world.event.bind(app.world);app.world.event=(p,e)=>{if(p.id===ids[0])emitted.push(e);return event(p,e);};
const http=spawn('python3',['-m','http.server','8998','--directory','web'],{stdio:'ignore'});let browser;
try{browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:844,height:390}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(t=>localStorage.setItem('cockro-online-device-token-v1',t),tokens[0]);
 await page.route('**/online.js',r=>r.fulfill({contentType:'text/javascript',body:readFileSync('web/online.js','utf8').replace('wss://game.guardscan.xyz/online/world',url)}));
 await page.route('**/game.js',r=>r.fulfill({contentType:'text/javascript',body:readFileSync('web/game.js','utf8')+'\nglobalThis.pvpQA={point:id=>{const e=net.players.find(q=>q.id===id);return e?project(e.x,e.y):null;},selected:()=>pvpTarget,position:()=>({x:p.x,y:p.y}),auto:()=>pvpAuto,audio:()=>({scene:gameAudio.scene,enabled:gameAudio.enabled,effects:[...gameAudio.effects.entries()].map(([name,a])=>({name,error:a.error?.message,ready:a.readyState,rate:a.playbackRate}))})};'}));
 await page.goto('http://127.0.0.1:8998');await page.locator('#createCharacter').click();assert.equal(await page.evaluate(()=>pvpQA.audio().scene),'create');await page.locator('#welcomeSound').click();assert.equal(await page.evaluate(()=>pvpQA.audio().enabled),false);await page.locator('#rosterBack').click();assert.equal(await page.evaluate(()=>pvpQA.audio().scene),'welcome');assert.equal(await page.evaluate(()=>pvpQA.audio().enabled),false);await page.locator('#welcomeSound').click();await page.locator('#choose').click();await page.waitForFunction(id=>globalThis.pvpQA?.point(id),ids[1]);
 await page.waitForFunction(()=>!document.querySelector('dialog')?.open);await page.waitForTimeout(500);const point=await page.evaluate(id=>pvpQA.point(id),ids[1]);console.log('click point',point);await page.screenshot({path:'review/audio431/before-click.png'});await page.mouse.click(point.x,point.y-35);await page.locator('#attackPlayer').click();
 for(let n=0;n<100&&!['s1','s2','s3','s4','s5'].every(id=>emitted.some(e=>e.kind==='skill'&&e.skillId===id));n++)await page.waitForTimeout(100);
 assert.deepEqual([...new Set(emitted.filter(e=>e.kind==='skill').map(e=>e.skillId))].slice(0,5).sort(),['s1','s2','s3','s4','s5']);
 await page.locator('#autoBtn').click();assert.equal(await page.evaluate(()=>pvpQA.auto()),false);await page.waitForTimeout(800);
 const pos=await page.evaluate(()=>pvpQA.position());await page.keyboard.down('a');await page.waitForTimeout(250);await page.keyboard.up('a');assert.equal(await page.evaluate(()=>pvpQA.selected()),ids[1]);assert.notDeepEqual(await page.evaluate(()=>pvpQA.position()),pos);
 // All five real UI buttons must send a new skill cast with auto disabled.
 for(let slot=0;slot<5;slot++){
  const actor=app.world.getActor(ids[0]);actor.cd[actor.s.equipped[slot]]=0;actor.mp=1000;actor.actionUntil=0;defender.hp=maxHP(defender.s);defender.x=actor.x+45;defender.y=actor.y;
  await page.waitForTimeout(700);const before=emitted.filter(e=>e.kind==='skill').length;
  await page.locator(slot?'#skillBtn'+slot:'#skillBtn').click();
  for(let n=0;n<20&&emitted.filter(e=>e.kind==='skill').length===before;n++)await page.waitForTimeout(100);
  const casts=emitted.filter(e=>e.kind==='skill');assert.equal(casts.length,before+1,'manual slot '+slot);assert.equal(casts.at(-1).skillId,'s'+(slot+1));
 }
 mkdirSync('review/audio431',{recursive:true});await page.screenshot({path:'review/audio431/all-skills.png'});const audio=await page.evaluate(()=>pvpQA.audio());assert.equal(audio.scene,'world');assert.equal(audio.enabled,true);assert.ok(audio.effects.some(a=>a.name==='skill-wave'));assert.ok(audio.effects.some(a=>a.name==='skill-field'));assert.ok(audio.effects.every(a=>!a.error&&a.ready>=2));console.log(JSON.stringify(audio));assert.deepEqual(errors,[]);console.log('PASS: real local server; auto casts all five in rotation; auto toggle; movement retains target; all five manual skill buttons cast; no page errors');
}finally{await browser?.close();http.kill();dummy.close();await app.close();rmSync(dir,{recursive:true,force:true});}
