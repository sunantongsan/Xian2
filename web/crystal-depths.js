import {monsterStats} from './balance.js';
import {ADVANCED_SPECIES} from './advanced-monsters.js';
import {t} from './i18n.js';

export const DEPTHS_MIN_LEVEL=120;
export const DEPTHS_EXIT=[.18,.955];
export const DEPTHS_ROOMS=[
 {center:[.18,.72],species:[8,13,3],min:120,max:139},
 {center:[.50,.72],species:[7,4,11],min:140,max:159,boss:11},
 {center:[.82,.72],species:[2,5,6],min:160,max:179},
 {center:[.82,.28],species:[14,12,17],min:180,max:199,boss:17},
 {center:[.50,.28],species:[9,10,15],min:200,max:219},
 {center:[.18,.28],species:[18,16,19],min:220,max:240,boss:19}
];
function chamber([u,v]){
 return [[-.12,-.08],[-.08,-.15],[.08,-.15],[.12,-.08],[.12,.08],[.08,.15],[-.08,.15],[-.12,.08]].map(([x,y])=>[u+x,v+y]);
}
const hall=(l,t,r,b)=>[[l,t],[r,t],[r,b],[l,b]];
export const DEPTHS_MAP={
 id:'depths',get name(){return t('รังผลึกใต้พิภพ');},image:'maps/crystal-depths.webp',width:4800,height:3000,
 spawn:[.18,.895],walk:[...DEPTHS_ROOMS.map(room=>chamber(room.center)),hall(.145,.83,.215,.98),
  hall(.26,.686,.74,.754),hall(.79,.38,.85,.62),hall(.26,.246,.74,.314)],
 pois:[{uv:DEPTHS_EXIT,action:'road',road:'town',get name(){return t('กลับเมืองแห่งทุ่งกุลา');}}]
};
function inhabitant(index,rank,species,level){
 const animal=ADVANCED_SPECIES[species],boss=rank===3,elite=rank===2;
 const stats=monsterStats(level,{elite,boss,toughness:animal.toughness});
 return {id:3000+index*4+rank,region:12+index,zone:2,slot:species,species,art:'advanced',depths:true,
  get name(){return (boss?t('ราชันรังผลึก'):elite?t('องครักษ์ผลึก'):t('อสูรผลึก'))+' · '+animal.name;},
  level,boss,elite,aggressive:true,attack:animal.attack,cooldown:2.15/animal.pace,speed:95*animal.pace,
  ...stats,hp:Math.round(stats.hp*1.3),damage:Math.round(stats.damage*1.5)};
}
export const DEPTHS_MONSTERS=DEPTHS_ROOMS.flatMap((room,i)=>{
 const levels=[room.min,room.min+8,room.max];
 const roster=room.species.map((species,rank)=>inhabitant(i,rank,species,levels[rank]));
 roster.push(inhabitant(i,3,room.boss??room.species[2],room.max));
 return roster;
});
export function makeDepthsPopulation(toWorld){
 return DEPTHS_MONSTERS.flatMap(def=>{
  const [u,v]=DEPTHS_ROOMS[def.region-12].center;
  const rank=(def.id-3000)%4,count=def.boss?1:def.elite?4:9;
  return Array.from({length:count},(_,i)=>{
   const angle=2*Math.PI*i/count+rank*.37;
   const radius=[.080,.052,.027,0][rank];
   const pos=toWorld([u+radius*Math.cos(angle),v+radius*1.32*Math.sin(angle)],DEPTHS_MAP);
   return {id:'depths-'+def.id+'-'+i,def,...pos,homeX:pos.x,homeY:pos.y,hp:def.hp,state:'idle',clock:1,face:1};
  });
 });
}
