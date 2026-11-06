import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const server=spawn('python3',['-m','http.server','8991','--directory','web'],{stdio:'ignore'});
let browser;
try {
 for(let n=0;n<50;n++){try{await fetch('http://127.0.0.1:8991');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1200,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/mutation-qa',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
 await page.goto('http://127.0.0.1:8991/mutation-qa');
 const result=await page.evaluate(async()=>{
  const {drawHero}=await import('/hero-animation.js'),{heroAssetFiles}=await import('/hero-assets.js');
  const {knownSkills,compileSkill}=await import('/skills.js'),{fresh,maxHP,damage}=await import('/core.js');
  document.body.innerHTML='';document.body.style='margin:0;background:#101b2c;color:white';
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1080;document.body.append(canvas);const ctx=canvas.getContext('2d');
  ctx.fillStyle='#101b2c';ctx.fillRect(0,0,1200,1080);let row=0,draws=0;const memory=[];
  for(const hero of ['sword-cockro','demon-scorpion','sword-dragonfly','sword-cricket'])for(const level of [1,20,60]){
   const files=heroAssetFiles(hero,level);if(!files.length)files.push('heroes/'+hero+'.webp');
   const images=new Map();for(const file of files){const im=new Image();im.src='/'+file;await im.decode();images.set(file,im);}
   memory.push({hero,level,decodedMiB:[...images.values()].reduce((n,im)=>n+im.naturalWidth*im.naturalHeight*4,0)/1048576});
   const state=fresh(hero);state.level=level;state.mutationStage=level>=60?2:level>=20?1:0;ctx.fillStyle='#fff';ctx.font='13px sans-serif';ctx.fillText(hero+' Lv.'+level+' HP '+maxHP(state)+' ATK '+damage(state),10,row*88+18);
   for(const [i,anim]of ['idle','walk','attack','skill','hurt','dead'].entries()){
    const actor={level,anim,animTime:.3,animDuration:.6,walkDistance:40,face:1,equip:state.equip,castId:state.equipped[0]};
    const rendered=drawHero(ctx,images,hero,actor,420+i*135,row*88+85,68);if(!rendered)throw Error('Missing '+hero+' '+level+' '+anim);draws++;
   }
   const k=compileSkill(knownSkills(state)[0]);if(!(k.power>0))throw Error('Invalid skill');row++;
  }
  return {draws,memory};
 });
 assert.equal(result.draws,72);assert.deepEqual(errors,[]);
 fs.mkdirSync('review',{recursive:true});fs.writeFileSync('review/mutation-browser.json',JSON.stringify(result,null,2));
 await page.screenshot({path:'review/mutation-browser.png'});console.log(JSON.stringify(result));
}finally{await browser?.close();server.kill();}
