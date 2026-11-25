import {t,ui} from './i18n.js';
// ดาวฮีโร่ (Hero Star): shared definitions for the generator, the runtime and tests.
// Sci-fi insect-hero planet for COCKRO: landing fields, alien groves, termite hills, mech graveyards, neon ruins, iron hives.
import {advancedMonster} from './advanced-monsters.js';

export const STAR_REVISION=20261116;
export const STAR_HOME_RADIUS=450;
export const STAR_TILE=48;          // world units per tile edge (same projection as actors)
export const STAR_SIZE=384;         // tiles per side

// Terrain tileset (firstgid 1). Zone grounds follow at ZONE_TERRAIN_BASE + zone*3 + (0 ground, 1 ground variant, 2 liquid).
export const T={VOID:0,CHASM:1,ROAD:2,BRIDGE:3,PLAZA:4};
export const ZONE_TERRAIN_BASE=5;
export const terrainId=(zone,part)=>ZONE_TERRAIN_BASE+zone*3+part;

export const PROPS=['bulbtree','mushroom','crystal','crystaltree','rock','meteor','pine','reed','lantern','mound','deadtree','pillar','obelisk','spire','wreck','hive','pylon','palm','cactus','sandstone','desert-house','foundation','town-wall'];

// Twelve zones, five levels each.
export const STAR_ZONES=[
 {get name(){return t('นครโอเอซิส');},en:'Oasis City',min:61,max:65,ground:['#dbb778','#edcf93'],liquid:{kind:'water',color:'#55b6bc'},props:{palm:4,cactus:2,sandstone:1},density:.045,lakes:0.78},
 {get name(){return t('สวนอินทผลัม');},en:'Date Palm Gardens',min:66,max:70,ground:['#c5b477','#e1c88b'],liquid:{kind:'water',color:'#55b6bc'},props:{palm:5,cactus:1,sandstone:1},density:.045,lakes:0.68},
 {get name(){return t('ทะเลทรายทอง');},en:'Golden Dunes',min:71,max:75,ground:['#dfb66f','#f0d190'],liquid:{kind:'water',color:'#55b6bc'},props:{cactus:4,sandstone:2},density:.045,lakes:0.94},
 {get name(){return t('เนินรังปลวก');},en:'Termite Dunes',min:76,max:80,ground:['#cf9d65','#e2b97e'],liquid:{kind:'water',color:'#55b6bc'},props:{mound:4,cactus:2,sandstone:2},density:.045,lakes:0.94},
 {get name(){return t('โอเอซิสโบราณ');},en:'Ancient Oasis',min:81,max:85,ground:['#c8b87e','#e0cb94'],liquid:{kind:'water',color:'#55b6bc'},props:{palm:4,sandstone:2},density:.045,lakes:0.65},
 {get name(){return t('ทะเลแก้วทราย');},en:'Glass Sand Basin',min:86,max:90,ground:['#ddd0ad','#f2e5c4'],liquid:{kind:'water',color:'#55b6bc'},props:{crystal:3,sandstone:4,cactus:1},density:.045,lakes:0.93},
 {get name(){return t('สุสานกองคาราวาน');},en:'Caravan Graveyard',min:91,max:95,ground:['#cdb08a','#e2c7a0'],liquid:{kind:'water',color:'#55b6bc'},props:{wreck:2,sandstone:4,deadtree:1},density:.045,lakes:0.96},
 {get name(){return t('หุบเขาแมงป่อง');},en:'Scorpion Canyon',min:96,max:100,ground:['#c18b62','#dda777'],liquid:{kind:'water',color:'#55b6bc'},props:{sandstone:6,cactus:2},density:.045,lakes:0.94},
 {get name(){return t('นครทรายสาบสูญ');},en:'Lost Sand City',min:101,max:105,ground:['#d3b480','#e8cca0'],liquid:{kind:'water',color:'#55b6bc'},props:{pillar:3,obelisk:2,sandstone:4},density:.045,lakes:0.96},
 {get name(){return t('รังแมลงสุริยะ');},en:'Sun Hive',min:106,max:110,ground:['#c59c5c','#ddb777'],liquid:{kind:'water',color:'#55b6bc'},props:{hive:4,sandstone:3,cactus:1},density:.045,lakes:0.95},
 {get name(){return t('หุบเขาราชัน');},en:'Kings Canyon',min:111,max:115,ground:['#bf986f','#d8b58c'],liquid:{kind:'water',color:'#55b6bc'},props:{obelisk:3,sandstone:4},density:.045,lakes:0.96},
 {get name(){return t('วิหารสุริยะ');},en:'Sun Temple',min:116,max:120,ground:['#ddb979','#f0d69e'],liquid:{kind:'water',color:'#55b6bc'},props:{pillar:4,obelisk:2,sandstone:3},density:.045,lakes:0.97},
];

export const zoneAtLevel=level=>STAR_ZONES.findIndex(z=>level>=z.min&&level<=z.max);
// Zones ending on a multiple of ten host the six existing alien bosses; the others get an elite pack leader.
export const bossZone=z=>STAR_ZONES[z].max%10===0;

// Hero Star is the advanced map, levels 61–120; identities match the bestiary.
export const starMonster=advancedMonster;



