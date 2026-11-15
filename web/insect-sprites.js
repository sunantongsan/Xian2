import {INSECT_ARMOR} from './insect-armor.js';
import {mantisFrame,drawMantisHero} from './mantis-hero.js';

// Appearance is derived only from server-owned equipped full-body sets.
export const INSECT_LOOKS=Object.freeze({
 'cockroach-male':{th:'แมงสาบชาย',en:'Cockroach · Male'},
 'cockroach-female':{th:'แมงสาบหญิง',en:'Cockroach · Female'},
 'ladybug-male':{th:'เต่าทองชาย',en:'Ladybug · Male'},
 'ladybug-female':{th:'เต่าทองหญิง',en:'Ladybug · Female'},
 'scorpion-male':{th:'แมงป่องชาย',en:'Scorpion · Male'},
 'scorpion-female':{th:'แมงป่องหญิง',en:'Scorpion · Female'},
 'beetle-female':{th:'ด้วงกว่างหญิง',en:'Beetle · Female',columns:12},
 'dragonfly-female':{th:'แมงปอหญิง',en:'Dragonfly · Female'},
 'mantis-male':{th:'ตั๊กแตนชาย',en:'Mantis · Male'},
 'mantis-female':{th:'ตั๊กแตนหญิง',en:'Mantis · Female'}
});
export function resolveInsectLook(actor={}){return Object.hasOwn(INSECT_ARMOR,actor.insectArmor)?actor.insectArmor:null;}
export function insectSpriteFile(id){return Object.hasOwn(INSECT_LOOKS,id)&&!id.startsWith('mantis-')?`heroes/insect-suits/${id}.webp`:null;}

// One full-resolution local atlas plus bounded half-resolution remote atlases.
export function createInsectSpriteCache(load,limit=2,cell=192){
 const images=new Map(),pending=new Map(),failed=new Map();let revision=0;
 const read=id=>{const im=images.get(id);if(im){images.delete(id);images.set(id,im);}return im;};
 const ensure=id=>{
  if(!insectSpriteFile(id))return Promise.resolve(null);
  const im=read(id);if(im)return Promise.resolve(im);if(pending.has(id))return pending.get(id);
  if(Date.now()-(failed.get(id)||0)<5000)return Promise.resolve(null);
  const task=Promise.resolve().then(()=>load(insectSpriteFile(id))).then(im=>{
   const columns=INSECT_LOOKS[id].columns||13;
   if(im.width!==columns*cell||im.height!==cell*4)throw Error('Invalid character atlas');
   images.set(id,im);while(images.size>limit)images.delete(images.keys().next().value);
   failed.delete(id);revision++;return im;
  }).catch(()=>{failed.set(id,Date.now());return null;}).finally(()=>pending.delete(id));
  pending.set(id,task);return task;
 };
 return {read,ensure,get revision(){return revision;},get size(){return images.size;}};
}
const load=async file=>{const im=new Image();im.src=file;await im.decode();return im;};
const cache=createInsectSpriteCache(load,1);
const remoteCache=createInsectSpriteCache(file=>load(file.replace('/insect-suits/','/insect-suits/remote/')),8,96);
export const insectSpriteRevision=()=>cache.revision+remoteCache.revision;
export const prepareInsectLook=id=>cache.ensure(id);
export function drawInsectSprite(ctx,images,actor,x,y,size){
 const id=resolveInsectLook(actor);if(!id||!Number.isFinite(size)||size<=0)return false;
 if(id.startsWith('mantis-'))return drawMantisHero(ctx,images,{...actor,insectArmor:'mantis',insectVariant:id.endsWith('female')?'female':'male'},x,y,size);
 const full=actor.spriteDetail==='full',active=full?cache:remoteCache,cell=full?192:96;
 const file=insectSpriteFile(id),im=images.get(file)||active.read(id);
 if(!im){if(typeof Image!=='undefined')void active.ensure(id);return false;}
 const columns=INSECT_LOOKS[id].columns||13;
 if(im.width!==columns*cell||im.height!==cell*4)return false;
 const pose=mantisFrame(actor);let column=pose.column;
 // The beetle source has only two defeat poses. Hold its last pose; never sample a neighbour.
 if(columns===12&&pose.clip==='dead')column=pose.column===10?10:11;
 column=Math.min(columns-1,column);
 const d=size*192/154;
 ctx.drawImage(im,column*cell,pose.row*cell,cell,cell,x-d/2,y-d*176/192,d,d);
 return {...pose,column,frame:column,sheet:id};
}
