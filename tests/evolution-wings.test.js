import test from 'node:test';import assert from 'node:assert/strict';
import {hasEvolutionWings,drawEvolutionWings} from '../web/evolution-wings.js';
import {drawHero} from '../web/hero-animation.js';
import {INSECT_LOOKS} from '../web/insect-sprites.js';
const hero='demon-scorpion',actor={level:60,mutationVersion:1,mutationStage:2,insectArmor:'scorpion-male'};
test('wings unlock at level 60 with a suit, including existing saves',()=>{
 assert(hasEvolutionWings(hero,actor));assert(hasEvolutionWings(hero,{level:60,insectArmor:'scorpion-male'}));
 assert(hasEvolutionWings(hero,{...actor,mutationStage:1}));
 for(const a of [{...actor,level:59},{...actor,insectArmor:null},{...actor,insectArmor:'invalid'}])assert(!hasEvolutionWings(hero,a));
});
test('all ten suits render finite wings behind the body in local and remote paths without changing saves',()=>{
 for(const insectArmor of Object.keys(INSECT_LOOKS))for(const anim of ['idle','walk','attack','skill','dead']){
 const a={...actor,insectArmor,anim,animTime:.2,walkDistance:20},before=JSON.stringify(a),calls=[];
 const g=new Proxy({globalAlpha:1},{get(t,k){return k in t?t[k]:(...args)=>{for(const x of args)if(typeof x==='number')assert(Number.isFinite(x));calls.push(k);};}});
 assert(drawEvolutionWings(g,hero,a,100,200,110));assert.equal(JSON.stringify(a),before);
 const images=new Map([[`heroes/insect-suits/${insectArmor}.webp`,{width:(insectArmor==='beetle-female'?12:13)*96,height:384}]]);
 if(!insectArmor.startsWith('mantis')){calls.length=0;drawHero(g,images,hero,a,100,200,110);assert(calls.indexOf('fill')<calls.indexOf('drawImage'));}
 }
});
