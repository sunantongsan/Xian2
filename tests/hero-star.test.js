import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseTiled,zoneAt,tileIndex} from '../web/tilemap.js';
import {walkable,routeTo,traceStep} from '../web/maps.js';
import {STAR_ZONES,starMonster,bossZone} from '../web/star-data.js';
import {MONSTERS,isKnownMonster} from '../web/catalog.js';

const json=JSON.parse(fs.readFileSync(new URL('../web/maps/hero-star.json',import.meta.url),'utf8'));
const star=parseTiled(json);
function reachable(){const seen=new Uint8Array(star.N*star.rows),start=tileIndex(star,star.spawn.x,star.spawn.y),q=[start];seen[start]=1;
 for(let h=0;h<q.length;h++){const i=q[h],c=i%star.N,r=Math.floor(i/star.N);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=c+dx,y=r+dy;if(x<0||y<0||x>=star.N||y>=star.rows)continue;const j=y*star.N+x;if(!seen[j]&&star.walk[j]){seen[j]=1;q.push(j);}}}return seen;}
const reach=reachable();

test('hero star is a large Tiled isometric map with 12 five-level zones covering 1-60',()=>{
 assert.equal(json.orientation,'isometric');assert.equal(json.type,'map');
 assert(star.N>=160&&star.rows>=160,'map should be large');
 assert.equal(star.zones.length,12);
 star.zones.forEach((z,i)=>{assert.equal(z.min,i*5+1);assert.equal(z.max,i*5+5);});
 assert(star.walk.reduce((a,b)=>a+b,0)>15000,'enough walkable ground');
});

test('every level 1-60 has camps, every zone has exactly one elite/boss, camps sit inside their zone and level band',()=>{
 const levels=new Map();
 for(let z=0;z<12;z++){const camps=star.spawns.filter(s=>s.zone===z);assert(camps.length>=12,'zone '+z+' camps');assert.equal(camps.filter(s=>s.elite).length,1,'zone '+z+' elite');}
 for(const s of star.spawns){
  assert(walkable(star,s),'camp walkable '+s.name);assert(reach[tileIndex(star,s.x,s.y)],'camp reachable '+s.name);
  assert.equal(zoneAt(star,s),s.zone,'camp in own zone '+s.name);
  const Z=STAR_ZONES[s.zone];assert(s.level>=Z.min&&s.level<=Z.max,s.name);
  assert([0,1,2].includes(s.species),'uses an alien-forest.webp art column');
  levels.set(s.level,(levels.get(s.level)||0)+1);
 }
 for(let l=1;l<=60;l++)assert(levels.get(l)>=2,'level '+l+' has camps');
 for(let z=0;z<12;z++)assert.equal(star.spawns.some(s=>s.zone===z&&s.boss),bossZone(z),'boss placement '+z);
});

test('warp gates and the town portal are reachable; walking from gate 1 to the core follows a clear route',()=>{
 for(const p of star.pois){assert(walkable(star,p.world),p.name);assert(reach[tileIndex(star,p.world.x,p.world.y)],p.name);}
 for(let z=0;z<12;z++){const g=star.pois.find(p=>p.action==='warp'&&p.zone===z);assert(g,'gate '+z);assert.equal(zoneAt(star,g.world),z);}
 const core=star.pois.find(p=>p.zone===11&&p.action==='warp').world;
 const route=routeTo(star,star.spawn,core);assert(route.length>0);let last=star.spawn;
 for(const p of route){assert(walkable(star,p));const end=traceStep(star,last,p);assert(Math.hypot(end.x-p.x,end.y-p.y)<1,'clear segment');last=p;}
 assert(Math.hypot(last.x-core.x,last.y-core.y)<1);
});

test('zones are separated by chasms and only consecutive zones connect',()=>{
 const N=star.N;
 for(let i=0;i<star.walk.length;i++){if(!star.walk[i])continue;const c=i%N,r=Math.floor(i/N);
  for(const [dx,dy]of [[1,0],[0,1]]){const j=(r+dy)*N+c+dx;if(c+dx>=N||r+dy>=star.rows||!star.walk[j])continue;const a=star.zone[i],b=star.zone[j];
   if(a!==b)assert(Math.abs(a-b)===1,`zones ${a} and ${b} touch at ${c},${r}`);}}
 // Outside the planet nothing is walkable, and chasms block movement.
 assert(!walkable(star,{x:-100,y:-100}));
 const chasm=star.kind.findIndex(k=>k==='chasm');assert(chasm>=0);assert(!walkable(star,{x:(chasm%N+.5)*star.T,y:(Math.floor(chasm/N)+.5)*star.T}));
});

test('local chase routing is bounded and still makes progress',()=>{
 const from=star.spawns[5],to=star.spawns.filter(c=>c.zone===from.zone).sort((a,b)=>Math.hypot(b.x-from.x,b.y-from.y)-Math.hypot(a.x-from.x,a.y-from.y))[0];const route=routeTo(star,from,to,300);
 assert(route.length>0);let last=from;for(const p of route){const end=traceStep(star,last,p);assert(Math.hypot(end.x-p.x,end.y-p.y)<1);last=p;}
});

test('star monsters use the exact catalog level, known ids and the six existing bosses',()=>{
 for(const l of [1,10,30,60]){const m=starMonster(l,{slot:2});assert.equal(m.level,l);assert.equal(m.hp,MONSTERS[l-1].hp);assert.equal(m.slot,2);assert(isKnownMonster(m.id));}
 const n=starMonster(25,{slot:1}),e=starMonster(25,{slot:1,elite:true});assert(e.hp>n.hp*3&&e.xp>n.xp*3&&e.elite&&!e.boss);
 for(let r=0;r<6;r++){const b=starMonster(r*10+10,{boss:true});assert(b.boss&&isKnownMonster(b.id)&&b.id===1060+r);}
});
