import {INSECT_ARMOR} from './insect-armor.js';
export function drawInsectArmor(ctx,id,j,direction,x,y,unit){
 const style=INSECT_ARMOR[id];if(!style)return;
 const pt=p=>[(p[0]-j.root[0])*unit+x,(p[1]-j.root[1])*unit+y];
 const l=pt(j.lShldrBend),r=pt(j.rShldrBend),hip=pt(j.hip),cx=(l[0]+r[0])/2,cy=(l[1]+r[1])/2;
 const length=Math.hypot(hip[0]-cx,hip[1]-cy),w=Math.max(7*unit,Math.hypot(l[0]-r[0],l[1]-r[1])*.62),angle=-Math.atan2(hip[0]-cx,hip[1]-cy),back=direction>=3&&direction<=5;
 ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);ctx.lineWidth=Math.max(.7,unit*.65);ctx.strokeStyle='#243e45';
 const g=ctx.createLinearGradient(-w,0,w,length);g.addColorStop(0,style.light);g.addColorStop(.3,style.color);g.addColorStop(.75,style.color);g.addColorStop(1,'#233849');ctx.fillStyle=g;
 ctx.beginPath();ctx.moveTo(-w,-2*unit);ctx.quadraticCurveTo(0,-5*unit,w,-2*unit);ctx.lineTo(w*.8,length*.7);ctx.quadraticCurveTo(0,length*1.12,-w*.8,length*.7);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle='#345354';ctx.lineWidth=unit*.3;
 // Segmented chitin and split elytra preserve an insect silhouette.
 for(let i=1;i<=3;i++){const h=length*i/4;ctx.beginPath();ctx.moveTo(-w*.85,h-2*unit);ctx.quadraticCurveTo(0,h+3*unit,w*.85,h-2*unit);ctx.stroke();}
 ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,length*.94);ctx.stroke();
 if(back&&(id==='butterfly'||id==='dragonfly')){ctx.globalAlpha=.7;for(const sign of [-1,1]){ctx.beginPath();ctx.ellipse(sign*w*.85,length*.35,w*.75,length*.48,sign*.3,0,Math.PI*2);ctx.fill();ctx.stroke();}ctx.globalAlpha=1;}
 if(!back){ctx.fillStyle=style.light;ctx.beginPath();ctx.ellipse(0,length*.26,unit*2.4,unit*3.4,0,0,7);ctx.fill();}
 ctx.restore();
 // Small shoulder plates move independently and leave swinging forearms visible.
 for(const [shoulder,hand]of [[l,pt(j.lHand)],[r,pt(j.rHand)]]){ctx.save();ctx.translate(...shoulder);ctx.rotate(Math.atan2(hand[1]-shoulder[1],hand[0]-shoulder[0])-Math.PI/2);ctx.fillStyle=style.color;ctx.strokeStyle='#345354';ctx.lineWidth=unit*.3;ctx.beginPath();ctx.ellipse(0,unit,unit*4.3,unit*3.2,0,0,7);ctx.fill();ctx.stroke();if(id==='beetle'||id==='mantis'){ctx.beginPath();ctx.moveTo(-unit*3,0);ctx.lineTo(0,-unit*5);ctx.lineTo(unit*3,0);ctx.fill();ctx.stroke();}ctx.restore();}
}
