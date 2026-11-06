import {forestMonster} from './forest-species.js';
import {MONSTERS} from './catalog.js';
import {MAPS,REGIONS,FOREST_COLS,FOREST_ROWS,toWorld,walkable,traceStep} from './maps.js';
export const PACK_SIZE=6,PACKS_PER_REGION=27,EXTRA_NORMALS=Math.ceil(6*PACK_SIZE*PACKS_PER_REGION*.20),EXTRA_BOSSES=40,POPULATION=6*(PACK_SIZE*PACKS_PER_REGION+1)+EXTRA_NORMALS+EXTRA_BOSSES;
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
   const tileCol=Math.floor(camp.uv[0]*FOREST_COLS),tileRow=Math.floor(camp.uv[1]*FOREST_ROWS),row=Number(camp.id.split('-').at(-1));
   const jitter=Math.sin((tileCol*31+tileRow*17+i*13+row*7))* .035;
   const position=toWorld([Math.max(.02,Math.min(.98,(tileCol+(i+.5)/6+jitter)/FOREST_COLS)),Math.max(.02,Math.min(.98,(tileRow+(row+.5)/3+jitter)/FOREST_ROWS))],MAPS.forest);
   const entry=toWorld(REGIONS[camp.region].entry,MAPS.forest);
   const level=camp.region*10+1+(Math.hypot(position.x-entry.x,position.y-entry.y)<700?i%3:camp.tier);
   const def=i%3===0?MONSTERS[level-1]:forestMonster(level);
   units.push(makeUnit(def,position,`${camp.id}-${i}`));
  }
 }
 for(const region of REGIONS){
  const col=Math.floor(region.center[0]*3)*3+1,row=region.id<3?3:0;
  const position=toWorld([(col+.5)/FOREST_COLS,(row+.34)/FOREST_ROWS],MAPS.forest);
  units.push(makeUnit(MONSTERS.find(m=>m.boss&&m.region===region.id),position,region.id+'-boss'));
 }
 // Extra wildlife is evenly interleaved among all 54 tiles, away from original rows.
 for(let i=0;i<EXTRA_NORMALS;i++){
  const region=REGIONS[i%6],n=Math.floor(i/6),tile=n%9;
  const col=Math.floor(region.center[0]*3)*3+tile%3,row=(region.id<3?3:0)+Math.floor(tile/3);
  const position=toWorld([(col+.18+(Math.floor(n/9)%4)*.21)/FOREST_COLS,(row+.31+(tile%2)*.38)/FOREST_ROWS],MAPS.forest);
  const entry=toWorld(region.entry,MAPS.forest),level=region.min+(Math.hypot(position.x-entry.x,position.y-entry.y)<700?n%3:(tile+n)%10);
  units.push(makeUnit(forestMonster(level),position,`extra-${i}`));
 }
 // Forty additional boss instances, one per distinct clearing; retain the original six.
 for(let i=0;i<EXTRA_BOSSES;i++){
  const region=REGIONS[i%6],tile=Math.floor(i/6),col=Math.floor(region.center[0]*3)*3+tile%3,row=(region.id<3?3:0)+Math.floor(tile/3);
  let position=toWorld([(col+.76)/FOREST_COLS,(row+.27)/FOREST_ROWS],MAPS.forest);
  const entry=toWorld(region.entry,MAPS.forest);
  if(Math.hypot(position.x-entry.x,position.y-entry.y)<850)position=toWorld([(col+.83)/FOREST_COLS,(row+.08)/FOREST_ROWS],MAPS.forest);
  units.push(makeUnit(MONSTERS.find(m=>m.boss&&m.region===region.id),position,`extra-boss-${i}`));
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



