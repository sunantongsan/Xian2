import {MONSTERS} from './catalog.js';
import {MAPS,REGIONS,toWorld,walkable,traceStep} from './maps.js';
export const PACK_SIZE=6,PACKS_PER_REGION=3,POPULATION=6*(PACK_SIZE*PACKS_PER_REGION+1);
const packOffsets=[[-.048,-.015],[.048,-.015],[0,.05]];
export function makePopulation(){
 const units=[];
 for(const region of REGIONS){
  for(let i=0;i<PACK_SIZE*PACKS_PER_REGION;i++){
   const pack=Math.floor(i/PACK_SIZE),[du,dv]=packOffsets[pack],center=toWorld([region.center[0]+du,region.center[1]+dv],MAPS.forest),a=(i%PACK_SIZE)*Math.PI*2/PACK_SIZE;
   const position=traceStep(MAPS.forest,center,{x:center.x+Math.cos(a)*95,y:center.y+Math.sin(a)*95});
   const tiers=[[3,3,4,4,5,5],[6,6,7,7,8,9],[0,0,1,1,2,2]];
   const def=MONSTERS[region.id*10+tiers[pack][i%PACK_SIZE]];units.push(makeUnit(def,position,region.id+'-'+i));
  }
  const position=toWorld([region.center[0],region.center[1]-.068],MAPS.forest);
  units.push(makeUnit(MONSTERS.find(m=>m.boss&&m.region===region.id),position,region.id+'-boss'));
 }
 return units;
}
function makeUnit(def,position,spawnId){return{def,...position,spawnId,hp:def.hp,state:'idle',clock:2,angle:0,face:1,flash:0,homeX:position.x,homeY:position.y,respawn:0};}
export function updateRespawns(enemies,player,dt){
 for(const e of enemies){if(e.hp>0)continue;e.respawn=(e.respawn??(e.def.boss?25:7))-dt;if(e.respawn>0||player.dead)continue;
  const home={x:e.homeX,y:e.homeY};let next=null;
  for(let i=0;i<9;i++){const radius=i===0?0:260,a=i*Math.PI/4,q={x:home.x+Math.cos(a)*radius,y:home.y+Math.sin(a)*radius};if(walkable(MAPS.forest,q)&&Math.hypot(q.x-player.x,q.y-player.y)>=230){next=q;break;}}
  if(next){Object.assign(e,makeUnit(e.def,home,e.spawnId),next);e.inv=0;delete e.dots;delete e.roamGoal;delete e.navPath;e.slow=0;e.aggroUntil=0;}
 }
}
