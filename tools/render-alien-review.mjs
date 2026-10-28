import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createCanvas,loadImage,GlobalFonts}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
GlobalFonts.registerFromPath('web/assets/NotoSansThai.ttf','GameThai');
const elements=new Map(),canvas=createCanvas(1000,650);
function el(id){if(id==='game')return canvas;if(!elements.has(id))elements.set(id,{style:{},dataset:{},classList:{add(){},remove(){}},addEventListener(){},setAttribute(){},querySelector(){return el('child'+id)},showModal(){this.open=true},close(){this.open=false}});return elements.get(id);}
canvas.addEventListener=()=>{};
globalThis.innerWidth=1000;globalThis.innerHeight=650;globalThis.devicePixelRatio=1;
globalThis.document={getElementById:el,querySelectorAll:()=>[],addEventListener(){},hidden:false};globalThis.addEventListener=()=>{};globalThis.window=globalThis;globalThis.localStorage={setItem(){}};
const source=fs.readFileSync('web/game.js','utf8').replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${new URL('../web/'+p.slice(2),import.meta.url).href}'`).replace('boot();','')+`\nexport const review={setup(state,hero,map,actors){s=state;p=hero;scene=map;town=map.id==='town';enemies=actors;time=1;mapZoom=.8;resize();},image:(path,im)=>images.set(path,im),draw,project};`;
const {review}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const {MAPS,toWorld}=await import('../web/maps.js');const {fresh}=await import('../web/core.js');const {makePopulation}=await import('../web/alien-population.js');
for(const path of ['maps/biolume-tile.webp','maps/aurora-outpost.webp','sprites/alien-forest.webp','heroes/cockro-combat-v2.webp'])review.image(path,await loadImage('web/'+path));
fs.mkdirSync('review',{recursive:true});
for(const [name,map,uv] of [['aurora-village',MAPS.town,[.50,.59]],['biolume-combat',MAPS.forest,[1/6,.75]]]){review.setup(fresh('sword-cockro'),{...toWorld(uv,map),face:1,anim:'idle',animTime:0},map,map.id==='forest'?makePopulation():[]);review.draw();fs.writeFileSync('review/'+name+'.png',canvas.toBuffer('image/png'));}
