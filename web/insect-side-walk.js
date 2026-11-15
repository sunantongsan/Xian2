import {INSECT_ARMOR} from './insect-armor.js';

// Body height and ground baseline measured in the 362px source rows.
const SIDE_GEOMETRY={
 'cockroach-male':[270,315],'cockroach-female':[280,329],
 'ladybug-male':[270,319],'ladybug-female':[275,321],
 'scorpion-male':[300,334],'scorpion-female':[290,333],
 'beetle-female':[300,334],'dragonfly-female':[285,322],
 'mantis-male':[300,334],'mantis-female':[290,333]
};

// The approved male scorpion sheet retains its original geometry and timing.
export function insectSideSpec(id,remote=false){
 if(!Object.hasOwn(INSECT_ARMOR,id))return null;
 const divisor=remote?2:1,w=id==='scorpion-male'?2172:1536,h=id==='scorpion-male'?724:512;
 const [body,foot]=SIDE_GEOMETRY[id];
 return {width:w/divisor,height:h/divisor,body:h/2*body/362/divisor,foot:h/2*foot/362/divisor};
}
export function insectSideFile(id,remote=false){return Object.hasOwn(INSECT_ARMOR,id)?`heroes/insect-suits/${remote?'remote/':''}${id}-side-walk.webp`:null;}

export function createInsectSideCache(load,{remote=false,limit=1}={}){
 const images=new Map(),pending=new Map(),failed=new Map();let revision=0;
 const read=id=>{const im=images.get(id);if(im){images.delete(id);images.set(id,im);}return im;};
 const ensure=id=>{
  const file=insectSideFile(id,remote);if(!file)return Promise.resolve(null);
  const existing=read(id);if(existing)return Promise.resolve(existing);
  if(pending.has(id))return pending.get(id);
  if(failed.has(id)&&Date.now()-failed.get(id)<5000)return Promise.resolve(null);
  const task=Promise.resolve().then(()=>load(file)).then(im=>{
   const spec=insectSideSpec(id,remote);
   if(im.width!==spec.width||im.height!==spec.height)throw Error('Invalid insect side-walk atlas');
   images.set(id,im);while(images.size>limit)images.delete(images.keys().next().value);
   failed.delete(id);revision++;return im;
  }).catch(()=>{failed.set(id,Date.now());return null;}).finally(()=>pending.delete(id));
  pending.set(id,task);return task;
 };
 return {read,ensure,get size(){return images.size;},get revision(){return revision;}};
}
const load=async file=>{const im=new Image();im.src=file;await im.decode();return im;};
const localCache=createInsectSideCache(load);
const remoteCache=createInsectSideCache(load,{remote:true,limit:10});
export const insectSideRevision=()=>localCache.revision+remoteCache.revision;
export const prepareInsectSide=id=>typeof Image==='undefined'?Promise.resolve(null):localCache.ensure(id);

export function drawInsectSideWalk(ctx,images,id,actor,pose,x,y,size){
 if(pose.clip!=='walk'||pose.row<2)return false;
 const remote=actor.spriteDetail!=='full',active=remote?remoteCache:localCache,spec=insectSideSpec(id,remote);
 if(!spec)return false;
 const im=images.get(insectSideFile(id,remote))||active.read(id);
 if(!im||im.width!==spec.width||im.height!==spec.height){
  if(typeof Image!=='undefined')void active.ensure(id);
  return false;
 }
 const distance=Number.isFinite(actor.walkDistance)?actor.walkDistance:0;
 const frame=Math.floor(((distance%96+96)%96)/96*8),row=pose.row===3?0:1;
 const sw=spec.width/8,sh=spec.height/2,k=size/spec.body;
 ctx.drawImage(im,frame*sw,row*sh,sw,sh,x-sw*k/2,y-spec.foot*k,sw*k,sh*k);
 return {...pose,column:frame,frame,sheet:id,sideWalk:true};
}
