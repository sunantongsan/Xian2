// ดาวฮีโร่ (Hero Star): shared definitions for the generator, the runtime and tests.
// Tile ids are local ids inside the Tiled tilesets written to maps/hero-star.json.

export const STAR_TILE=48;          // world units per tile edge (same projection as actors)
export const STAR_SIZE=192;         // tiles per side

// Terrain tileset (firstgid 1). Zone grounds follow at ZONE_TERRAIN_BASE + zone*3 + (0 ground, 1 ground variant, 2 liquid).
export const T={VOID:0,CHASM:1,ROAD:2,BRIDGE:3,PLAZA:4};
export const ZONE_TERRAIN_BASE=5;
export const terrainId=(zone,part)=>ZONE_TERRAIN_BASE+zone*3+part;

export const PROPS=['bulbtree','mushroom','crystal','crystaltree','rock','meteor','pine','reed','lantern','tomb','deadtree','pillar','obelisk','spire'];

// Twelve zones, five levels each. pool = catalog monster ids used here (art reused from monsters-0..2.webp).
export const STAR_ZONES=[
 {name:'ทุ่งดาวตก',en:'Meteor Meadow',min:1,max:5,ground:['#6f9e5c','#86b468'],liquid:{kind:'water',color:'#4f9fc0'},props:{bulbtree:4,meteor:2,rock:1},density:.07,lakes:.66},
 {name:'ป่าเห็ดเรืองแสง',en:'Glowcap Grove',min:6,max:10,ground:['#3f7a6c','#4d8b74'],liquid:{kind:'water',color:'#3f8fb0'},props:{mushroom:5,bulbtree:2,rock:1},density:.09,lakes:.68},
 {name:'ป่าคริสตัลหยก',en:'Jade Crystal Wood',min:11,max:15,ground:['#4e8f6a','#5fa577'],liquid:{kind:'water',color:'#47b5a5'},props:{crystaltree:4,crystal:3,rock:1},density:.09,lakes:.67,crystal:'#7ff5c4'},
 {name:'ที่ราบพยัคฆ์หยก',en:'Jade Tiger Plains',min:16,max:20,ground:['#a6a25a','#b9b26a'],liquid:{kind:'water',color:'#4f9fbd'},props:{bulbtree:2,rock:3,meteor:1},density:.06,lakes:.7},
 {name:'หุบหมอกเนบิวลา',en:'Nebula Mist Vale',min:21,max:25,ground:['#6f8a8c','#7d9a98'],liquid:{kind:'water',color:'#6aa6c2'},props:{pine:3,rock:3,crystal:1},density:.08,lakes:.66,crystal:'#9fd6ff'},
 {name:'บึงแสงจันทร์',en:'Moonlight Marsh',min:26,max:30,ground:['#4f7468','#5c8473'],liquid:{kind:'water',color:'#3b7f9a'},props:{reed:4,lantern:2,mushroom:1},density:.08,lakes:.58},
 {name:'ยอดผาลอยฟ้า',en:'Floating Peaks',min:31,max:35,ground:['#9aa3a0','#aab2ad'],liquid:{kind:'chasm',color:'#0b1430'},props:{pine:4,rock:3},density:.08,lakes:.67},
 {name:'หุบอสรพิษ',en:'Serpent Gorge',min:36,max:40,ground:['#5e7a52','#6b8758'],liquid:{kind:'acid',color:'#7fc24e'},props:{rock:3,deadtree:2,pine:2},density:.09,lakes:.68},
 {name:'ทุ่งสุสานดวงดาว',en:'Starfall Graveyard',min:41,max:45,ground:['#7b7385','#877e90'],liquid:{kind:'mist',color:'#5d5874'},props:{tomb:4,deadtree:3,lantern:1},density:.08,lakes:.69},
 {name:'ซากนครดาวโบราณ',en:'Ancient Star Ruins',min:46,max:50,ground:['#b09a76','#bea886'],liquid:{kind:'chasm',color:'#0b1430'},props:{pillar:4,obelisk:2,rock:1},density:.07,lakes:.69},
 {name:'หุบเหวเงาวิญญาณ',en:'Soul Abyss',min:51,max:55,ground:['#5a4b6e','#665579'],liquid:{kind:'acid',color:'#62d49a'},props:{crystal:3,lantern:2,deadtree:2},density:.09,lakes:.67,crystal:'#c79bff'},
 {name:'แกนดาวเพลิง',en:'Star Core',min:56,max:60,ground:['#4a3a3c','#574446'],liquid:{kind:'lava',color:'#ff7a2e'},props:{spire:4,crystal:2,meteor:1},density:.09,lakes:.65,crystal:'#ff8a5c'},
];

export const zoneAtLevel=level=>STAR_ZONES.findIndex(z=>level>=z.min&&level<=z.max);

// Stats follow the catalog's own scaling (hp 34+10L, xp 10+5L, gold 5+3L) so the new map does not distort balance.
export function starMonster(base,level,{elite=false,boss=false}={}){
 const hp=34+10*level,dmg=Math.round(3.4+.64*level),xp=10+5*level,gold=5+3*level;
 const m=boss?{hp:3,dmg:1.5,xp:5,gold:4}:elite?{hp:3.5,dmg:1.4,xp:4,gold:4}:{hp:1,dmg:1,xp:1,gold:1};
 return {id:base.id,sheet:base.zone,slot:base.slot,name:elite&&!boss?'หัวหน้า'+base.name:base.name,en:base.en,level,
  boss,elite:elite||boss,hp:Math.round(hp*m.hp),damage:Math.round(dmg*m.dmg),speed:base.speed,attack:base.attack,
  cooldown:boss||elite?Math.max(1.6,base.cooldown-.4):base.cooldown,xp:Math.round(xp*m.xp),gold:Math.round(gold*m.gold)};
}
