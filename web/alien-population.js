import {MONSTERS} from './catalog.js';
import {MAPS,REGIONS,FOREST_COLS,FOREST_ROWS,toWorld,walkable,traceStep} from './maps.js';
export const PACK_SIZE=6,PACKS_PER_REGION=27,POPULATION=6*(PACK_SIZE*PACKS_PER_REGION+1);
// Nine full-size clearings in each level band, with three hunting packs per clearing.
// Tile geometry and texture retain their original scale; the world gains actual land.
export const CAMPS=REGIONS.flatMap(region=>{
 const baseCol=Math.floor(region.center[0]*3)*3,baseRow=region.id<3?3:0;
 const camps=[];
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){
  for(const [index,u,v] of [[0,.38,.46],[1,.62,.46],[2,.50,.65]]){
   const tier=Math.min(9,(2-row)*3+col+([1,2,0][index]));
   camps.push({id:`${region.id}-${row}-${col}-${index}`,region:region.id,tier,uv:[(baseCol+col+u)/FOREST_COLS,(baseRow+row+v)/FOREST_ROWS]});
  }
 }
 return camps;
});
export function makePopulation(){
 const units=[];
 for(const camp of CAMPS){
  const center=toWorld(camp.uv,MAPS.forest);
  for(let i=0;i<PACK_SIZE;i++){
   const a=i*Math.PI*2/PACK_SIZE;
   const position=traceStep(MAPS.forest,center,{x:center.x+Math.cos(a)*165,y:center.y+Math.sin(a)*165});
   const def=MONSTERS[camp.region*10+camp.tier];
   units.push(makeUnit(def,position,`${camp.id}-${i}`));
  }
 }
 for(const region of REGIONS){
  const col=Math.floor(region.center[0]*3)*3+1,row=region.id<3?3:0;
  const position=toWorld([(col+.5)/FOREST_COLS,(row+.34)/FOREST_ROWS],MAPS.forest);
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


