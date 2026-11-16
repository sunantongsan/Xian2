import {mutationStage} from './mutation.js';
import {INSECT_DISPLAY_SCALE,resolveInsectLook} from './insect-sprites.js';
// Cosmetic only. Read the completed NPC advancement, never level alone or an item grant.
export function hasEvolutionWings(hero,actor){return !!resolveInsectLook(actor)&&mutationStage({...actor,hero})===2;}
export function drawEvolutionWings(g,hero,actor,x,y,size){
 if(!Number.isFinite(size)||size<=0||!hasEvolutionWings(hero,actor))return false;
 const insect=actor.insectArmor.split('-')[0],colors={scorpion:['#c9adf0','#655184'],cockroach:['#e8c98c','#856331'],ladybug:['#f2a6a3','#8d3b47'],beetle:['#d7b3f2','#654a87'],dragonfly:['#b5edf0','#39838e'],mantis:['#d1efad','#5b8554']},[fill,edge]=colors[insect];
 const phase=actor.anim==='walk'?(actor.walkDistance||0)/45:(actor.animTime||0)*2;
 const sideView=Math.abs((actor.aimDX??actor.walkDX??1)-(actor.aimDY??actor.walkDY??1))>Math.abs((actor.aimDX??actor.walkDX??1)+(actor.aimDY??actor.walkDY??1))*1.5;
 g.save();g.translate(x,y-size*INSECT_DISPLAY_SCALE*.62);g.scale(size*INSECT_DISPLAY_SCALE/100,size*INSECT_DISPLAY_SCALE/100);
 if(actor.dead||actor.anim==='dead')g.globalAlpha*=.45;
 // Four outlined membranes stay legible without glow, particles or extra image decoding.
 for(const side of [-1,1]){g.save();g.scale(side*(sideView?.68:1),1);g.rotate(-.15+Math.sin(phase)*.035);g.fillStyle=fill;g.strokeStyle=edge;g.lineWidth=.9;
  for(const lower of [false,true]){g.save();if(lower){g.rotate(.65);g.scale(.73,.68);}g.beginPath();g.moveTo(0,0);g.bezierCurveTo(12,-32,43,-43,55,-29);g.bezierCurveTo(62,-13,28,5,0,0);g.closePath();g.globalAlpha*=.82;g.fill();g.stroke();g.beginPath();g.moveTo(2,-1);g.quadraticCurveTo(27,-14,52,-28);g.moveTo(23,-12);g.lineTo(28,-30);g.moveTo(33,-18);g.lineTo(46,-12);g.stroke();g.restore();}g.restore();}
 g.restore();return true;
}
