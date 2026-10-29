// ดาวฮีโร่ (Hero Star): shared definitions for the generator, the runtime and tests.
// Sci-fi insect-hero planet for COCKRO: landing fields, alien groves, termite hills, mech graveyards, neon ruins, iron hives.
import {MONSTERS,SPECIES} from './catalog.js';

export const STAR_TILE=48;          // world units per tile edge (same projection as actors)
export const STAR_SIZE=192;         // tiles per side

// Terrain tileset (firstgid 1). Zone grounds follow at ZONE_TERRAIN_BASE + zone*3 + (0 ground, 1 ground variant, 2 liquid).
export const T={VOID:0,CHASM:1,ROAD:2,BRIDGE:3,PLAZA:4};
export const ZONE_TERRAIN_BASE=5;
export const terrainId=(zone,part)=>ZONE_TERRAIN_BASE+zone*3+part;

export const PROPS=['bulbtree','mushroom','crystal','crystaltree','rock','meteor','pine','reed','lantern','mound','deadtree','pillar','obelisk','spire','wreck','hive','pylon'];

// Twelve zones, five levels each.
export const STAR_ZONES=[
 {name:'ลานจอดยานฮีโร่',en:'Hero Landing Fields',min:1,max:5,ground:['#6f9e5c','#86b468'],liquid:{kind:'water',color:'#4f9fc0'},props:{bulbtree:4,meteor:2,pylon:1},density:.07,lakes:.66},
 {name:'ป่าเห็ดเรืองแสง',en:'Glowcap Grove',min:6,max:10,ground:['#3f7a6c','#4d8b74'],liquid:{kind:'water',color:'#3f8fb0'},props:{mushroom:5,bulbtree:2,rock:1},density:.09,lakes:.68},
 {name:'ทุ่งสปอร์อำพัน',en:'Amber Spore Fields',min:11,max:15,ground:['#9c9a4e','#b0aa5c'],liquid:{kind:'acid',color:'#f0b43a'},props:{mushroom:3,bulbtree:2,rock:1},density:.08,lakes:.68},
 {name:'เนินรังปลวกยักษ์',en:'Termite Mound Hills',min:16,max:20,ground:['#a87652','#b98762'],liquid:{kind:'water',color:'#4f9fbd'},props:{mound:5,rock:2,deadtree:1},density:.08,lakes:.7},
 {name:'หนองน้ำกรด',en:'Acid Swamp',min:21,max:25,ground:['#4f6e4a','#5b7c52'],liquid:{kind:'acid',color:'#8fdc4e'},props:{reed:4,deadtree:2,mushroom:1},density:.08,lakes:.6},
 {name:'ป่าคริสตัลไซเบอร์',en:'Cyber Crystal Woods',min:26,max:30,ground:['#3f5f7a','#4b6d88'],liquid:{kind:'water',color:'#39b6d6'},props:{crystaltree:4,crystal:3,pylon:1},density:.09,lakes:.67,crystal:'#7ff5ff'},
 {name:'สุสานหุ่นรบ',en:'Mech Graveyard',min:31,max:35,ground:['#7d8288','#8b9096'],liquid:{kind:'chasm',color:'#0b1430'},props:{wreck:4,rock:2,pylon:1},density:.08,lakes:.67},
 {name:'หุบรังแมงป่อง',en:'Scorpion Canyon',min:36,max:40,ground:['#b9714a','#c7805a'],liquid:{kind:'chasm',color:'#0b1430'},props:{rock:4,meteor:2,deadtree:1},density:.08,lakes:.68},
 {name:'นครนีออนร้าง',en:'Neon Ruins',min:41,max:45,ground:['#4a4f66','#565b74'],liquid:{kind:'water',color:'#2fc8f0'},props:{pillar:3,obelisk:2,lantern:2},density:.08,lakes:.69,crystal:'#ff5fd2'},
 {name:'รังผึ้งเหล็ก',en:'Iron Hive',min:46,max:50,ground:['#8a6f3c','#9a7d46'],liquid:{kind:'acid',color:'#f2b230'},props:{hive:4,pylon:2,rock:1},density:.08,lakes:.69},
 {name:'รอยแยกพลังมืด',en:'Void Rift',min:51,max:55,ground:['#5a4b6e','#665579'],liquid:{kind:'acid',color:'#b58cff'},props:{crystal:3,obelisk:2,deadtree:2},density:.09,lakes:.67,crystal:'#c79bff'},
 {name:'แกนดาวเพลิง',en:'Planet Core',min:56,max:60,ground:['#4a3a3c','#574446'],liquid:{kind:'lava',color:'#ff7a2e'},props:{spire:4,crystal:2,meteor:1},density:.09,lakes:.65,crystal:'#ff8a5c'},
];

export const zoneAtLevel=level=>STAR_ZONES.findIndex(z=>level>=z.min&&level<=z.max);
// Zones ending on a multiple of ten host the six existing alien bosses; the others get an elite pack leader.
export const bossZone=z=>STAR_ZONES[z].max%10===0;

// Monster at an exact level from the COCKRO catalog (ids 1000-1059 / bosses 1060-1065), with the camp's species art.
export function starMonster(level,{slot=0,elite=false,boss=false}={}){
 if(boss){const b=MONSTERS.find(m=>m.boss&&m.region===Math.floor((level-1)/10));return {...b,elite:true};}
 const base=MONSTERS[Math.max(1,Math.min(60,level))-1],sp=SPECIES[slot]||SPECIES[base.slot];
 const m={...base,slot:sp.slot,name:sp.name,attack:sp.attack,elite:false};
 if(elite)Object.assign(m,{name:'หัวหน้า'+sp.name,elite:true,hp:Math.round(base.hp*3.5),damage:base.damage*1.4,xp:base.xp*4,gold:base.gold*4,cooldown:Math.max(1.6,base.cooldown-.4)});
 return m;
}
