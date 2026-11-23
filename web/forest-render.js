// Measured opaque bounds in the painted 1024×1536 sheet, with the original display height.
const forestFrames=[
 [21,83,258,291,230],[273,73,520,290,230],[524,74,748,283,230],[776,89,1003,292,230],
 [24,357,250,554,230],[277,366,520,560,237],[531,349,768,572,245],[782,344,1009,577,255],
 [14,633,264,846,245],[269,625,509,836,250],[529,643,769,853,245],[779,627,1016,849,255],
 [18,908,254,1149,255],[252,909,538,1138,255],[528,913,748,1146,250],[774,923,1011,1138,245],
 [21,1189,252,1447,275],[248,1204,510,1445,280],[515,1208,796,1442,275],[753,1198,1010,1458,285]
];
const apexFrames=[[11,136,488,587,520],[525,65,1015,607,580]];
// Each row is a pose. The original atlas has uneven padding and crosses the nominal cell rows.
const alienFrames=[
 [[101,72,329,309],[512,17,755,318],[902,12,1179,312]],
 [[92,357,352,612],[503,325,771,622],[881,315,1210,623]],
 [[89,667,360,918],[489,626,791,919],[897,626,1220,925]],
 [[64,951,370,1205],[447,925,803,1206],[875,925,1211,1205]]
];
function drawFootFrame(g,image,frame,sourceW,sourceH,scale){
 const [left,top,right,bottom]=frame,w=right-left,h=bottom-top;
 const sx=image.width/sourceW,sy=image.height/sourceH;
 g.drawImage(image,left*sx,top*sy,w*sx,h*sy,-w*scale/2,-h*scale,w*scale,h*scale);
}
export function drawAlienFrame(g,image,e,x,y,size){
 if(!image)return;
 const phase=e.moving?Math.floor((e.walkDistance||0)/35)%2:0;
 const row=e.state==='attack'||e.state==='windup'?3:e.moving?1+phase:0;
 g.save();g.translate(x,y);g.scale(e.face<0?-1:1,1);
 drawFootFrame(g,image,alienFrames[row][e.def.slot%3],1254,1254,size/(1254/4));
 g.restore();
}
const winged=new Set([2,6,9,12,13,19]);
export function drawForestMonster(g,im,e,x,y,size,time,detail=null){
 if(!im)return false;
 const slot=e.def.species,apex=slot>=18&&detail,frame=apex?apexFrames[slot-18]:forestFrames[slot];
 const phase=(e.walkDistance||0)/20,stride=e.moving?Math.sin(phase):0;
 const flying=winged.has(slot),wind=e.state==='windup';
 const breath=Math.sin(time*2.4+slot)*.009;
 const clearance=flying&&e.hp>0?size*(.045+.009*Math.sin(time*5+slot)):0;
 g.save();g.translate(x,y-clearance);g.scale(e.face<0?-1:1,1);
 if(e.hp<=0){g.rotate(.3);g.scale(1,.65);}
 else{
  const compression=breath+(flying?0:Math.abs(stride)*.025);
  g.transform(1-compression,0,wind?.04:stride*.035,1+compression,0,0);
 }
 drawFootFrame(g,apex?detail:im,frame,1024,apex?683:1536,size/frame[4]);
 g.restore();return true;
}

import {drawPlasmaTexture} from './combat-vfx.js';
import {drawMonsterZones} from './forest-species.js';
export function drawMonsterAttack(g,e,project,scale,quality,texture){
 if(!texture)return;
 const textureRow=['ring','spray','web','roots'].includes(e.pattern)?1:['drill','rupture','fault','solar'].includes(e.pattern)?0:['sonic','artillery','magnet'].includes(e.pattern)?3:2;
 for(const z of e.zones.slice(0,quality==='low'?4:8)){
  if(z.type==='disk'){
   if(z.inner){for(let i=0;i<4;i++){const a=i*Math.PI/2;const c={x:z.x+Math.cos(a)*(z.radius+z.inner)/2,y:z.y+Math.sin(a)*(z.radius+z.inner)/2};drawPlasmaTexture(g,{...e,...c,textureRow,form:'circle',radius:(z.radius-z.inner)/2,aim:c},project,scale,'low',texture);}}
   else drawPlasmaTexture(g,{...e,x:z.x,y:z.y,textureRow,form:'circle',radius:z.radius,aim:{x:z.x,y:z.y}},project,scale,'low',texture);
  }else{const points=z.points,start=points.length===3?{x:points[0][0],y:points[0][1]}:{x:(points[0][0]+points[3][0])/2,y:(points[0][1]+points[3][1])/2},aim={x:(points[1][0]+points[2][0])/2,y:(points[1][1]+points[2][1])/2};drawPlasmaTexture(g,{...e,...start,textureRow,form:'wave',aim,range:Math.hypot(aim.x-start.x,aim.y-start.y),radius:Math.hypot(points[1][0]-points[2][0],points[1][1]-points[2][1])/2},project,scale,'low',texture);}
 }
}
