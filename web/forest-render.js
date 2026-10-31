// Painted creature atlas; gait, breathing, hovering and cast anticipation are independent.
export function drawForestMonster(g,im,e,x,y,size,time){
 if(!im)return false;const slot=e.def.species,cw=im.width/5;
 // Painted rows have slightly unequal gutters. Sample each row's authored bounds
 // instead of including antennae from the next row in a uniform 4-way slice.
 const rows=[[0,.241],[.25,.226],[.478,.239],[.725,.275]],row=rows[Math.floor(slot/5)],sy=row[0]*im.height,ch=row[1]*im.height;
 const flying=[2,6,9,12,13,19].includes(slot),phase=(e.walkDistance||0)/20;
 const stride=e.moving?Math.sin(phase):0,breathe=Math.sin(time*2.4+slot)*.012;
 const wind=e.state==='windup',lean=wind?Math.sin(time*18)*.02:stride*.025;
 const bob=flying?Math.sin(time*4+slot)*size*.035-6:Math.abs(stride)*-size*.035;
 g.save();g.translate(x,y+bob);g.scale(e.face<0?-1:1,1);g.rotate(lean);
 if(e.hp<=0){g.rotate(.3);g.scale(1,.65);}else g.scale(1-breathe,1+breathe+(wind?.035:0));
 const width=size*1.2;g.drawImage(im,slot%5*cw+cw*.012,sy,cw*.976,ch,-width/2,-size,width,size);g.restore();return true;
}

import {drawPlasmaTexture} from './combat-vfx.js';
import {drawMonsterZones} from './forest-species.js';
export function drawMonsterAttack(g,e,project,scale,quality,texture){
 const t=1-e.life/e.max;drawMonsterZones(g,e.zones,project,scale,e.color,.26*(1-t));if(!texture)return;
 const textureRow=['ring','spray','web','roots'].includes(e.pattern)?1:['drill','rupture','fault','solar'].includes(e.pattern)?0:['sonic','artillery','magnet'].includes(e.pattern)?3:2;
 for(const z of e.zones.slice(0,quality==='low'?4:8)){
  if(z.type==='disk'){
   if(z.inner){for(let i=0;i<4;i++){const a=i*Math.PI/2;const c={x:z.x+Math.cos(a)*(z.radius+z.inner)/2,y:z.y+Math.sin(a)*(z.radius+z.inner)/2};drawPlasmaTexture(g,{...e,...c,textureRow,form:'circle',radius:(z.radius-z.inner)/2,aim:c},project,scale,'low',texture);}}
   else drawPlasmaTexture(g,{...e,x:z.x,y:z.y,textureRow,form:'circle',radius:z.radius,aim:{x:z.x,y:z.y}},project,scale,'low',texture);
  }else{const points=z.points,start=points.length===3?{x:points[0][0],y:points[0][1]}:{x:(points[0][0]+points[3][0])/2,y:(points[0][1]+points[3][1])/2},aim={x:(points[1][0]+points[2][0])/2,y:(points[1][1]+points[2][1])/2};drawPlasmaTexture(g,{...e,...start,textureRow,form:'wave',aim,range:Math.hypot(aim.x-start.x,aim.y-start.y),radius:Math.hypot(points[1][0]-points[2][0],points[1][1]-points[2][1])/2},project,scale,'low',texture);}
 }
}
