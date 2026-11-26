import {drawInsectSprite} from './insect-sprites.js';
import {HUMAN_JOINTS} from './human-joints.js';
export const HUMAN_HEROES=['sword-cockro','demon-scorpion','sword-dragonfly','sword-cricket','sword-mage','sword-acolyte'];
export const HUMAN_DIRECTIONS=['S','SW','W','NW','N','NE','E','SE'];
export const HUMAN_CLIPS={walk:{frames:32,duration:1},idle:{frames:12,duration:2},attack:{frames:16,duration:.46},skill:{frames:16,duration:.6},hurt:{frames:8,duration:.26},dead:{frames:12,duration:.8}};
export const HUMAN_STRIDE=78;
export const humanFiles=hero=>HUMAN_HEROES.includes(hero)?Object.keys(HUMAN_CLIPS).map(k=>`heroes/human/${k}.webp`):[];
export function humanDirection(actor={}){
 const dx=Number.isFinite(actor.aimDX)?actor.aimDX:actor.walkDX??.707,dy=Number.isFinite(actor.aimDY)?actor.aimDY:actor.walkDY??.707;
 if(Math.hypot(dx,dy)<1e-5)return 0;
 return (Math.round(Math.atan2(-.8*(dx-dy),.4*(dx+dy))/(Math.PI/4))+8)%8;
}
export function humanFrame(actor={}){
 const clip=actor.dead||actor.anim==='dead'?'dead':Object.hasOwn(HUMAN_CLIPS,actor.anim)?actor.anim:'idle',spec=HUMAN_CLIPS[clip];
 const elapsed=Math.max(0,Number.isFinite(actor.animTime)?actor.animTime:0);
 // One stride contains both alternating steps. Pausing movement freezes the distance phase.
 const phase=clip==='walk'?((((actor.walkDistance||0)/HUMAN_STRIDE)%1)+1)%1:clip==='idle'?(elapsed/spec.duration)%1:Math.min(1,elapsed/(actor.animDuration||spec.duration));
 return {clip,direction:humanDirection(actor),frame:Math.min(spec.frames-1,Math.floor(phase*spec.frames))};
}
export function drawHumanHero(ctx,images,hero,actor,x,y,size){
 if(!HUMAN_HEROES.includes(hero)||!Number.isFinite(size)||size<=0)return false;
 if(actor.receivedAt!==undefined){const dt=Math.max(0,Math.min(.2,(performance.now()-actor.receivedAt)/1000));actor={...actor,animTime:(actor.visualAnimTime||0)+dt,walkDistance:actor.renderFrom?actor.renderFrom.walkDistance+(actor.walkDistance-actor.renderFrom.walkDistance)*Math.min(1,dt/.1):actor.walkDistance};}
 if(actor.anim==='idle'&&actor.hurtAt&&performance.now()-actor.hurtAt<260)actor={...actor,anim:'hurt',animTime:(performance.now()-actor.hurtAt)/1000};
 const suit=drawInsectSprite(ctx,images,actor,x,y,size);if(suit)return suit;
 const f=humanFrame(actor),im=images.get(`heroes/human/${f.clip}.webp`);if(!im)return false;
 const j=HUMAN_JOINTS[f.clip]?.[HUMAN_DIRECTIONS[f.direction]]?.[f.frame];if(!j)return false;
 const drawSize=size*j.ortho/1.6,unit=drawSize/128;
 ctx.drawImage(im,f.frame*128,f.direction*128,128,128,x-j.root[0]*unit,y-j.root[1]*unit,drawSize,drawSize);
 return {...f,sheet:'human-rig'};
}
