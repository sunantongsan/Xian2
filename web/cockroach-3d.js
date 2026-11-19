import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {actor as makeActor} from './stage-rig.js';
let renderer,scene,camera,rig,pending,feetAnchor=.9;
const cache=new Map(),SIZE=256;
export function loadCockroach3D(){
 if(pending)return pending;
 pending=(async()=>{
  const base=new URL('./models/',import.meta.url),indexResponse=await fetch(new URL('cockroach.json',base));if(!indexResponse.ok)throw Error('model_index');const index=await indexResponse.json();const pieces=new Array(index.chunks.length);let next=0;
  await Promise.all(Array.from({length:6},async()=>{while(next<index.chunks.length){const i=next++;const response=await fetch(new URL(index.chunks[i],base));if(!response.ok)throw Error('model_chunk');pieces[i]=atob(await response.json());}}));
  const bytes=new Uint8Array(index.bytes);let offset=0;for(const raw of pieces)for(let i=0;i<raw.length;i++)bytes[offset++]=raw.charCodeAt(i);
  if(offset!==index.bytes)throw Error('model_size');
  const digest=await crypto.subtle.digest('SHA-256',bytes);if(Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('')!==index.sha256)throw Error('model_integrity');const gltf=await new GLTFLoader().parseAsync(bytes.buffer,base.href);
  for(const name of ['Idle','Walk','Run','Hit','Death'])if(!gltf.animations.some(c=>c.name===name))throw Error('missing_animation_'+name);
  gltf.scene.getObjectByName('COCKRO_Rifle')?.traverse(o=>o.visible=false);
  rig=makeActor(gltf);
  try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});}catch{console.warn("3D unavailable; using the cockroach compatibility renderer");return false;}renderer.setPixelRatio(1);renderer.setSize(SIZE,SIZE);renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cache.clear();});
  scene=new T.Scene();scene.add(rig.root,new T.HemisphereLight(0xffffff,0x839582,2.4));const light=new T.DirectionalLight(0xffedcf,2.8);light.position.set(3,5,4);scene.add(light);
  camera=new T.OrthographicCamera(-1.8,1.8,1.8,-1.8,.01,100);camera.position.set(0,1.9,6);camera.lookAt(0,1.4,0);camera.updateMatrixWorld(true);feetAnchor=(1-new T.Vector3(0,0,0).project(camera).y)/2;
  rig.play('Guard');rig.seek(0);return true;
 })().catch(e=>{console.warn('COCKRO 3D unavailable; using compatibility renderer:',e.message);rig=null;renderer?.dispose();renderer=null;return false;});return pending;
}
export function drawCockroach3D(ctx,actor,x,y,size){
 if(!rig||!renderer||renderer.getContext().isContextLost())return false;
 const mode=actor.dead||actor.anim==='dead'?'Death':actor.anim==='hurt'?'Hit':actor.anim==='attack'?['Slash','Sweep','Cleave'][(actor.combo||0)%3]:actor.anim==='skill'?'Cleave':actor.anim==='dash'?'Roll':actor.anim==='walk'?'Walk':'Guard';
 const clip=rig.actions[mode];const duration=clip.getClip().duration;
 const looping=['Walk','Guard'].includes(mode);
 const raw=mode==='Walk'?(actor.walkDistance||0)/112*duration:looping?(actor.animTime||0):Math.min(1,(actor.animTime||0)/(actor.animDuration||(['Slash','Sweep','Cleave'].includes(mode)?.35:duration)))*duration;
 const step=looping?Math.floor((raw%duration)/duration*12):Math.min(15,Math.floor(raw/duration*15));
 const attacking=['attack','skill'].includes(actor.anim),dx=attacking?(actor.aimDX||actor.walkDX||0):(actor.walkDX||0),dy=attacking?(actor.aimDY||actor.walkDY||0):(actor.walkDY||0);
 const direction=actor.portrait?0:Math.hypot(dx,dy)>.001?Math.atan2(dx-dy,dx+dy):actor.back?Math.PI:(actor.face||1)<0?-Math.PI/2:0;
 const heading=((Math.round(direction/(Math.PI/4))%8)+8)%8,key=mode+':'+step+':'+heading;
 let frame=cache.get(key);
 if(!frame){
  rig.play(mode,true);for(const [n,a]of Object.entries(rig.actions)){a.enabled=n===mode;if(n===mode){a.stopFading();a.setEffectiveWeight(1);}}
  rig.root.rotation.y=heading*Math.PI/4;rig.seek(step/(looping?12:15)*duration);renderer.render(scene,camera);
  frame=document.createElement('canvas');frame.width=frame.height=SIZE;frame.getContext('2d').drawImage(renderer.domElement,0,0);cache.set(key,frame);
  if(cache.size>96)cache.delete(cache.keys().next().value);
 }
 if(actor.portrait)ctx.drawImage(frame,32,48,192,192,25,0,240,240);else ctx.drawImage(frame,x-size*.75,y-size*1.5*feetAnchor,size*1.5,size*1.5);return true;
}
