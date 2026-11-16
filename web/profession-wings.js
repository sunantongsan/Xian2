import {INSECT_JOBS,profession} from './insect-professions.js';
import {mutationStage} from './mutation.js';
// Cosmetic advancement marker; never an inventory item or shop product.
export const wingProfession=actor=>mutationStage(actor)===2?profession(actor):null;
export function drawProfessionWings(ctx,actor,x,y,size){
 const id=wingProfession(actor);if(!id||!Number.isFinite(size)||size<=0)return false;
 const color=INSECT_JOBS[id].color,phase=(actor.walkDistance||0)/40+(actor.animTime||0)*2;
 const side=Math.abs(actor.walkDX||0)>0&&Math.abs((actor.walkDX||0)+(actor.walkDY||0))<.25;
 const flap=actor.dead?.65:.92+Math.sin(phase)*.08;
 ctx.save();ctx.translate(x,y-size*.62);ctx.scale(size/120*(side?.65:1),size/120);ctx.lineWidth=1.15;ctx.strokeStyle=color;ctx.fillStyle=color+'88';
 const pairs=id==='dragonfly'?2:1;
 for(const sign of [-1,1])for(let i=0;i<pairs;i++){
  ctx.save();ctx.scale(sign*flap,1);ctx.rotate(i*.48);
  ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(15,-32,46,-48,59,-40);ctx.bezierCurveTo(66,-17,36,15,0,10);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle='#fff5d9aa';ctx.lineWidth=.7;for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(2,5);ctx.quadraticCurveTo(22,-9-j*7,51-j*9,-32+j*13);ctx.stroke();}
  if(id==='ladybug'){ctx.fillStyle='#79364b99';for(const [a,b]of [[29,-19],[44,-28],[21,-3]]){ctx.beginPath();ctx.arc(a,b,3,0,7);ctx.fill();}}
  ctx.restore();
 }
 ctx.restore();return true;
}
