// Painted creature atlas; gait, breathing, hovering and cast anticipation are independent.
export function drawForestMonster(g,im,e,x,y,size,time,detail=null){
 if(!im)return false;const slot=e.def.species;
 // Source bounds follow the painted silhouettes rather than assumed equal cells.
 // They exclude adjacent wings/antennae while retaining each creature's aspect ratio.
 const cells=[[12,65,246,230],[270,65,246,230],[525,65,234,230],[772,75,245,230],
 [12,338,245,230],[269,338,253,237],[527,335,242,245],[775,330,242,255],
 [5,615,260,245],[266,610,250,250],[526,620,247,245],[779,610,240,255],
 [10,895,243,255],[252,895,280,255],[540,900,225,250],[776,910,242,245],
 [10,1180,241,275],[252,1185,262,280],[518,1190,258,275],[785,1180,233,285]];
 let [cx,cy,sw,sh]=cells[slot],sx=im.width/1024,sy=im.height/1536;
 if(slot>=18&&detail){im=detail;[cx,cy,sw,sh]=slot===18?[0,130,760,780]:[778,75,750,870];sx=im.width/1536;sy=im.height/1024;}

 const flying=[2,6,9,12,13,19].includes(slot),phase=(e.walkDistance||0)/20;
 const stride=e.moving?Math.sin(phase):0,breathe=Math.sin(time*2.4+slot)*.012;
 const wind=e.state==='windup',lean=wind?Math.sin(time*18)*.02:stride*.025;
 const bob=flying?Math.sin(time*4+slot)*size*.035-6:Math.abs(stride)*-size*.035;
 g.save();g.translate(x,y+bob);g.scale(e.face<0?-1:1,1);g.rotate(lean);
 if(e.hp<=0){g.rotate(.3);g.scale(1,.65);}else g.scale(1-breathe,1+breathe+(wind?.035:0));
 const width=size*sw/sh;g.drawImage(im,cx*sx,cy*sy,sw*sx,sh*sy,-width/2,-size,width,size);g.restore();return true;
}

import {drawMonsterZones} from './forest-species.js';
// Keep the complete damage footprint readable, with no layered textures or particles.
export function drawMonsterAttack(g,e,project,scale){
 const t=Math.max(0,Math.min(1,1-e.life/e.max));
 drawMonsterZones(g,e.zones,project,scale,e.color,.14*(1-t));
}
