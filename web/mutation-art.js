import {MUTATION_ART} from './mutation-art-data.js';
import {layeredFrame} from './layered-hero.js';
// Save species IDs remain unchanged; appearance is derived from authoritative level.
export function mutationArtFor(hero,level=1){
 const n=Number.isFinite(level)?Math.max(1,Math.floor(level)):1;
 if(hero==='sword-dragonfly'&&n<20)return 'dragonfly-green';
 if(hero==='demon-scorpion'&&n<20)return 'scorpion-gold';
 if(hero==='sword-cockro'&&n>=60)return 'cockro-guard';
 if(hero==='sword-cricket'&&n>=20)return n>=60?'cricket-engineer':'cricket-scientist';
 return null;
}
export function mutationFiles(hero,level=1){const key=mutationArtFor(hero,level);return key?[MUTATION_ART[key].file]:[];}
export function drawMutationHero(ctx,images,hero,actor,x,y,size){
 const key=mutationArtFor(hero,actor.level),data=MUTATION_ART[key],im=data&&images.get(data.file);
 if(!im||!Number.isFinite(size)||size<=0)return;
 const pose=layeredFrame(actor),frame=data.frames[pose.frame],r=frame.rect;
 ctx.save();ctx.translate(x,y);const scale=size/data.referenceHeight;ctx.scale(pose.flip?-scale:scale,scale);
 ctx.drawImage(im,...r,-frame.pivot[0],-frame.pivot[1],r[2],r[3]);ctx.restore();
 return {sheet:key,frame:pose.frame,flip:pose.flip,mutation:true};
}
