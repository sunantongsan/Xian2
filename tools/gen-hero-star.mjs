// Generates web/maps/hero-star.json — the ดาวฮีโร่ open-world map — as a Tiled 1.10 isometric JSON map.
// Deterministic: `node tools/gen-hero-star.mjs [seed]`. The map can afterwards be edited in Tiled;
// the game reads layer/tileset names and tile properties, not hard-coded gids.
import fs from 'node:fs';
import {STAR_ZONES,STAR_SIZE as N,STAR_TILE,T,terrainId,PROPS,bossZone} from '../web/star-data.js';

const seed=Number(process.argv[2]||20261029);
let st=seed>>>0;const rnd=()=>{st=(st+0x6D2B79F5)>>>0;let t=st;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
const hash=(x,y,s)=>{let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(s,2147483647);h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;};
const smooth=t=>t*t*(3-2*t);
function noise(x,y,s){const xi=Math.floor(x),yi=Math.floor(y),xf=smooth(x-xi),yf=smooth(y-yi);const a=hash(xi,yi,s),b=hash(xi+1,yi,s),c=hash(xi,yi+1,s),d=hash(xi+1,yi+1,s);return a+(b-a)*xf+(c-a)*yf+(a-b-c+d)*xf*yf;}
const fbm=(x,y,s)=>(noise(x,y,s)*.55+noise(x*2.1,y*2.1,s+1)*.3+noise(x*4.3,y*4.3,s+2)*.15);

const idx=(c,r)=>r*N+c, inMap=(c,r)=>c>=0&&r>=0&&c<N&&r<N;
const C=N/2-.5, RADIUS=88;
const terrain=new Uint8Array(N*N), zoneOf=new Int8Array(N*N).fill(-1), prop=new Int16Array(N*N).fill(-1), keep=new Uint8Array(N*N);
const N4=[[1,0],[-1,0],[0,1],[0,-1]], N8=[...N4,[1,1],[-1,-1],[1,-1],[-1,1]];

// 1. Planet disc with a ragged rim.
const planet=(c,r)=>{const dx=c-C,dy=r-C,a=Math.atan2(dy,dx);return Math.hypot(dx,dy)<RADIUS-6*fbm(Math.cos(a)*3+9,Math.sin(a)*3+9,seed)+2;};

// 2. Zone seeds: outer ring 0..7 starts at the bottom of the screen (+x,+y), inner ring 8..10, core 11.
const base=Math.PI/4, seeds=[];
for(let i=0;i<8;i++){const a=base+i*Math.PI/4;seeds.push([C+Math.cos(a)*66,C+Math.sin(a)*66]);}
for(let i=0;i<3;i++){const a=base+7*Math.PI/4+i*2*Math.PI/3;seeds.push([C+Math.cos(a)*36,C+Math.sin(a)*36]);}
seeds.push([C,C]);
for(let r=0;r<N;r++)for(let c=0;c<N;c++){
 if(!planet(c,r)){terrain[idx(c,r)]=T.VOID;continue;}
 const wx=c+(fbm(c/14,r/14,seed+7)-.5)*22, wy=r+(fbm(c/14,r/14,seed+8)-.5)*22, d=Math.hypot(c-C,r-C);
 let best=0,bd=Infinity;
 for(let z=0;z<12;z++){const ring=z<8?'outer':z<11?'inner':'core';
  // Ring bands keep progression readable: outer/inner/core use different radii.
  if(ring==='outer'&&d<50-8*fbm(c/9,r/9,seed+3))continue; if(ring==='inner'&&(d>=58||d<17))continue; if(ring==='core'&&d>=22)continue;
  const dist=Math.hypot(wx-seeds[z][0],wy-seeds[z][1]);if(dist<bd){bd=dist;best=z;}}
 zoneOf[idx(c,r)]=best;
}
// 3. Ground variants per zone.
for(let i=0;i<N*N;i++){if(zoneOf[i]<0)continue;const c=i%N,r=Math.floor(i/N);terrain[i]=terrainId(zoneOf[i],fbm(c/7,r/7,seed+11)>.55?1:0);}

// 4. Chasms between zones and along the rim (2-3 tiles wide).
const isBorder=(c,r)=>{const z=zoneOf[idx(c,r)];for(const [dx,dy]of N8){const x=c+dx,y=r+dy;if(!inMap(x,y)||zoneOf[idx(x,y)]!==z)return true;}return false;};
const border=new Uint8Array(N*N);
for(let r=0;r<N;r++)for(let c=0;c<N;c++){const i=idx(c,r);if(zoneOf[i]>=0&&isBorder(c,r))border[i]=1;}
for(let r=0;r<N;r++)for(let c=0;c<N;c++){const i=idx(c,r);if(zoneOf[i]<0)continue;let rim=false,zoneEdge=false;
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=c+dx,y=r+dy;if(!inMap(x,y))continue;const j=idx(x,y);if(zoneOf[j]<0)rim=true;else if(border[j]&&zoneOf[j]!==zoneOf[i])zoneEdge=true;}
 if(border[i]||zoneEdge)terrain[i]=T.CHASM;else if(rim)terrain[i]=T.CHASM;}

// 5. Hubs: the deepest interior tile near each seed (largest distance to chasm).
const depth=new Int16Array(N*N).fill(-1),q=[];
for(let i=0;i<N*N;i++)if(terrain[i]===T.CHASM||terrain[i]===T.VOID){depth[i]=0;q.push(i);}
for(let h=0;h<q.length;h++){const i=q[h],c=i%N,r=Math.floor(i/N);for(const [dx,dy]of N4){const x=c+dx,y=r+dy;if(!inMap(x,y))continue;const j=idx(x,y);if(depth[j]<0){depth[j]=depth[i]+1;q.push(j);}}}
const hubs=seeds.map(([sx,sy],z)=>{let best=-1,score=-Infinity;for(let i=0;i<N*N;i++){if(zoneOf[i]!==z||terrain[i]===T.CHASM)continue;const c=i%N,r=Math.floor(i/N),sc=Math.min(depth[i],9)*3-Math.hypot(c-sx,r-sy)*.6;if(sc>score){score=sc;best=i;}}return [best%N,Math.floor(best/N)];});
// The start hub sits toward the outer rim of zone 0 so the journey runs inward.
{const [hx,hy]=hubs[0];hubs[0]=[Math.round(hx+(hx-C)*.12),Math.round(hy+(hy-C)*.12)];while(terrain[idx(...hubs[0])]===T.CHASM||depth[idx(...hubs[0])]<6){hubs[0]=[hubs[0][0]-Math.sign(hubs[0][0]-C),hubs[0][1]-Math.sign(hubs[0][1]-C)];}}

// 6. Roads hub i -> hub i+1 (A* allowed in the two zones and their shared chasm only), carved 3 wide; chasm becomes bridge.
function astar([sc,sr],[gc,gr],allowed){const start=idx(sc,sr),goal=idx(gc,gr),g=new Float64Array(N*N).fill(Infinity),par=new Int32Array(N*N).fill(-1),open=[[0,start]];g[start]=0;
 const push=n=>{open.push(n);let k=open.length-1;while(k){const p=(k-1)>>1;if(open[p][0]<=open[k][0])break;[open[p],open[k]]=[open[k],open[p]];k=p;}};
 const pop=()=>{const top=open[0],last=open.pop();if(open.length){open[0]=last;let k=0;for(;;){const a=2*k+1,b=a+1;let m=k;if(a<open.length&&open[a][0]<open[m][0])m=a;if(b<open.length&&open[b][0]<open[m][0])m=b;if(m===k)break;[open[m],open[k]]=[open[k],open[m]];k=m;}}return top;};
 while(open.length){const [,cur]=pop();if(cur===goal)break;const c=cur%N,r=Math.floor(cur/N);for(const [dx,dy]of N8){const x=c+dx,y=r+dy;if(!inMap(x,y))continue;const j=idx(x,y);if(!allowed(j))continue;const step=Math.hypot(dx,dy)*(terrain[j]===T.CHASM?6:1)*(1+.8*fbm(x/6,y/6,seed+21));const ng=g[cur]+step;if(ng<g[j]){g[j]=ng;par[j]=cur;push([ng+Math.hypot(x-gc,y-gr),j]);}}}
 const path=[];for(let k=goal;k>=0;k=par[k]){path.push(k);if(k===start)break;}return path.reverse();}
const zoneOfChasm=i=>{const c=i%N,r=Math.floor(i/N),set=new Set();for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const x=c+dx,y=r+dy;if(inMap(x,y)&&zoneOf[idx(x,y)]>=0)set.add(zoneOf[idx(x,y)]);}return set;};
const roads=new Uint8Array(N*N);
// Every pair of neighbouring zones gets a road and bridge, so the whole planet is one connected world
// (consecutive zones first, then the remaining neighbours such as 8-1 and the inner ring to the core).
const touching=new Map();
for(let i=0;i<N*N;i++){if(terrain[i]!==T.CHASM||depth[i]!==0)continue;const s=[...zoneOfChasm(i)];if(s.length!==2)continue;const key=Math.min(...s)+'-'+Math.max(...s);touching.set(key,(touching.get(key)||0)+1);}
const pairs=[...Array(11)].map((_,z)=>[z,z+1]);
for(const [key,n] of touching){const [a,b]=key.split('-').map(Number);if(n>=25&&b-a!==1)pairs.push([a,b]);}
for(const [a,b] of pairs){
 const path=astar(hubs[a],hubs[b],j=>{if(zoneOf[j]<0)return false;if(terrain[j]!==T.CHASM)return zoneOf[j]===a||zoneOf[j]===b;if(depth[j]===0){const s=zoneOfChasm(j);return s.has(a)&&s.has(b)&&![...s].some(v=>v!==a&&v!==b);}return false;});
 if(path.at(-1)!==idx(...hubs[b]))throw new Error('no road '+a+'->'+b);
 for(const i of path){const c=i%N,r=Math.floor(i/N);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=c+dx,y=r+dy;if(!inMap(x,y))continue;const j=idx(x,y);if(zoneOf[j]<0)continue;if(terrain[j]===T.CHASM){if(depth[j]===0)terrain[j]=T.BRIDGE;}else terrain[j]=T.ROAD;roads[j]=1;keep[j]=1;}}}
// Bridges must not leak into a third zone: chasm tiles touching the void stay chasm (planet rim).
for(let i=0;i<N*N;i++)if(terrain[i]===T.BRIDGE){const c=i%N,r=Math.floor(i/N);for(const [dx,dy]of N8){const x=c+dx,y=r+dy;if(inMap(x,y)&&zoneOf[idx(x,y)]<0){terrain[i]=T.CHASM;break;}}}

// 7. Plazas around warp gates — always clear. Gate 1 is the heroes' home base (spawn, shops, portals), so it is larger.
for(const [z,[hc,hr]]of hubs.entries()){const R=z===0?9.4:5.4;for(let dy=-10;dy<=10;dy++)for(let dx=-10;dx<=10;dx++){const x=hc+dx,y=hr+dy;if(!inMap(x,y)||Math.hypot(dx,dy)>R)continue;const j=idx(x,y);if(zoneOf[j]<0||terrain[j]===T.CHASM)continue;terrain[j]=T.PLAZA;keep[j]=1;}}
{const core=keep.slice();for(let i=0;i<N*N;i++)if(core[i]){const c=i%N,r=Math.floor(i/N);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=c+dx,y=r+dy;if(inMap(x,y))keep[idx(x,y)]||=2;}}}

// 8. Lakes (water/lava/acid/mist/inner chasms) and props.
for(let i=0;i<N*N;i++){const z=zoneOf[i];if(z<0||keep[i]||terrain[i]<T.PLAZA+1)continue;const c=i%N,r=Math.floor(i/N),Z=STAR_ZONES[z];
 if(fbm(c/9,r/9,seed+31+z)>Z.lakes&&depth[i]>2)terrain[i]=terrainId(z,2);}
const propKinds=STAR_ZONES.map(Z=>Object.entries(Z.props).flatMap(([k,w])=>Array(w).fill(PROPS.indexOf(k))));
for(let i=0;i<N*N;i++){const z=zoneOf[i];if(z<0||keep[i]||terrain[i]===T.CHASM||terrain[i]===terrainId(z,2))continue;const c=i%N,r=Math.floor(i/N),Z=STAR_ZONES[z];
 const cluster=fbm(c/6,r/6,seed+41);const chance=Z.density*(cluster>.58?3.2:cluster>.48?1:.25)+(depth[i]<=2?.18:0);
 if(rnd()<chance){const kinds=propKinds[z];prop[i]=kinds[Math.floor(rnd()*kinds.length)];}}

// 9. Keep only what the start can reach; unreachable pockets become rock props so nothing is visible-but-stuck.
const walk=i=>terrain[i]!==T.VOID&&terrain[i]!==T.CHASM&&(zoneOf[i]<0||terrain[i]!==terrainId(zoneOf[i],2)||STAR_ZONES[zoneOf[i]].liquid.kind==='mist')&&prop[i]<0;
function flood(){const seen=new Uint8Array(N*N),s=idx(...hubs[0]),list=[s];seen[s]=1;for(let h=0;h<list.length;h++){const i=list[h],c=i%N,r=Math.floor(i/N);for(const [dx,dy]of N4){const x=c+dx,y=r+dy;if(!inMap(x,y))continue;const j=idx(x,y);if(!seen[j]&&walk(j)){seen[j]=1;list.push(j);}}}return seen;}
let reach=flood();
for(let i=0;i<N*N;i++)if(walk(i)&&!reach[i])prop[i]=PROPS.indexOf('rock');
reach=flood();

// 10. Monster camps: Poisson-like sampling per zone, each camp 1-3 monsters; one elite or boss camp per zone.
// Species (alien art column 0-2) varies per camp; levels rise with distance from the zone's warp gate.
const spawns=[];let nextId=1;
const zoneStats=[];
for(let z=0;z<12;z++){const Z=STAR_ZONES[z],boss=bossZone(z);
 const cand=[];for(let i=0;i<N*N;i++)if(zoneOf[i]===z&&reach[i]&&terrain[i]!==T.PLAZA&&!roads[i])cand.push(i);
 const [hc,hr]=hubs[z];const camps=[];
 for(let tries=0;tries<4000&&camps.length<26;tries++){const i=cand[Math.floor(rnd()*cand.length)],c=i%N,r=Math.floor(i/N);if(Math.hypot(c-hc,r-hr)<(z===0?16:9))continue;if(camps.some(([x,y])=>Math.hypot(x-c,y-r)<6.5))continue;
  let open=0;for(const [dx,dy]of N8)if(walk(idx(c+dx,r+dy))&&reach[idx(c+dx,r+dy)])open++;if(open<7)continue;camps.push([c,r]);}
 camps.sort((a,b)=>Math.hypot(b[0]-hc,b[1]-hr)-Math.hypot(a[0]-hc,a[1]-hr));
 const regular=camps.length-1;
 camps.forEach(([c,r],k)=>{const elite=k===0;const level=elite?Z.max:Z.min+Math.min(4,Math.floor((regular-k)/regular*5));
  spawns.push({id:nextId++,name:(elite?(boss?'boss':'elite'):'camp')+'-'+z+'-'+k,c,r,zone:z,level,species:Math.floor(rnd()*3),count:elite?1:1+Math.floor(rnd()*3),elite,boss:elite&&boss});});
 zoneStats.push({zone:z,camps:camps.length,boss});
}

// 11. Points of interest: warp gate per zone (gate 0 is the arrival point) and the portal back to town beside it.
const pois=hubs.map(([c,r],z)=>({name:'ประตูวาร์ป • '+STAR_ZONES[z].name,type:'warp',c,r,zone:z}));
// Home base services around gate 1 (offsets inside the radius-9 plaza; nudged onto plaza tiles if needed).
{const [hc,hr]=hubs[0];
 const svc=[['คลังเสบียง','shop',-6,1],['โรงอัปเกรด','forge',1,-6],['ศูนย์ฝึกฮีโร่','skills',-4,-5],['สถานีออโรรา','town',6,-1],['ประตูป่าชีวะแสง','forest',4,5]];
 for(const [name,type,dx,dy] of svc){let c=hc+dx,r=hr+dy;for(let k=0;k<8&&terrain[idx(c,r)]!==T.PLAZA;k++){c-=Math.sign(dx);r-=Math.sign(dy);}pois.push({name,type,c,r,zone:0});}}

// 12. Write Tiled JSON.
const prop1=(name,type,value)=>({name,type,value});
const TERR_GID=1, PROP_GID=101, ZONE_GID=201;
const terrainTiles=[];
const addT=(id,kind,walkable,zone=-1,extra={})=>terrainTiles.push({id,properties:[prop1('kind','string',kind),prop1('walkable','bool',walkable),prop1('zone','int',zone),...Object.entries(extra).map(([k,v])=>prop1(k,'string',v))]});
addT(T.VOID,'void',false);addT(T.CHASM,'chasm',false);addT(T.ROAD,'road',true);addT(T.BRIDGE,'bridge',true);addT(T.PLAZA,'plaza',true);
STAR_ZONES.forEach((Z,z)=>{addT(terrainId(z,0),'ground',true,z,{color:Z.ground[0]});addT(terrainId(z,1),'ground',true,z,{color:Z.ground[1]});addT(terrainId(z,2),Z.liquid.kind,Z.liquid.kind==='mist',z,{color:Z.liquid.color});});
// Mist pools are walkable decoration; keep the generator's collision consistent with that.
const tilesMeta=new Map(terrainTiles.map(t=>[t.id,Object.fromEntries(t.properties.map(p=>[p.name,p.value]))]));
const pixel=(c,r)=>({x:(c+.5)*32,y:(r+.5)*32});
let oid=1;
const map={type:'map',version:'1.10',tiledversion:'1.10.2',orientation:'isometric',renderorder:'right-down',width:N,height:N,tilewidth:64,tileheight:32,infinite:false,compressionlevel:-1,
 properties:[prop1('title','string','ดาวฮีโร่'),prop1('en','string','Hero Star'),prop1('tileWorld','int',STAR_TILE),prop1('seed','int',seed),prop1('generator','string','tools/gen-hero-star.mjs')],
 tilesets:[
  {firstgid:TERR_GID,name:'hero-star-terrain',tilewidth:64,tileheight:32,tilecount:terrainTiles.length,columns:0,margin:0,spacing:0,grid:{orientation:'isometric',width:64,height:32},tiles:terrainTiles},
  {firstgid:PROP_GID,name:'hero-star-props',tilewidth:64,tileheight:96,tilecount:PROPS.length,columns:0,margin:0,spacing:0,grid:{orientation:'isometric',width:64,height:32},tiles:PROPS.map((k,id)=>({id,properties:[prop1('kind','string',k),prop1('walkable','bool',false)]}))},
  {firstgid:ZONE_GID,name:'hero-star-zones',tilewidth:64,tileheight:32,tilecount:12,columns:0,margin:0,spacing:0,grid:{orientation:'isometric',width:64,height:32},tiles:STAR_ZONES.map((Z,id)=>({id,properties:[prop1('name','string',Z.name),prop1('en','string',Z.en),prop1('minLevel','int',Z.min),prop1('maxLevel','int',Z.max)]}))}],
 layers:[]};
const layer=(name,data)=>({id:map.layers.length+1,name,type:'tilelayer',width:N,height:N,x:0,y:0,opacity:1,visible:true,data});
map.layers.push(layer('ground',[...terrain].map(t=>t+TERR_GID)));
map.layers.push(layer('props',[...prop].map(p=>p<0?0:p+PROP_GID)));
map.layers.push({...layer('zones',[...zoneOf].map(z=>z<0?0:z+ZONE_GID)),visible:false});
map.layers.push({id:map.layers.length+1,name:'spawns',type:'objectgroup',draworder:'topdown',opacity:1,visible:true,x:0,y:0,objects:spawns.map(s=>({id:oid++,name:s.name,type:s.boss?'boss':s.elite?'elite':'camp',...pixel(s.c,s.r),width:0,height:0,point:true,rotation:0,visible:true,properties:[prop1('zone','int',s.zone),prop1('level','int',s.level),prop1('species','int',s.species),prop1('count','int',s.count)]}))});
map.layers.push({id:map.layers.length+1,name:'pois',type:'objectgroup',draworder:'topdown',opacity:1,visible:true,x:0,y:0,objects:pois.map(p=>({id:oid++,name:p.name,type:p.type,...pixel(p.c,p.r),width:0,height:0,point:true,rotation:0,visible:true,properties:[prop1('zone','int',p.zone)]}))});
map.nextlayerid=map.layers.length+1;map.nextobjectid=oid;
// Mist must be walkable both here (stats) and in game; recompute reach count with metadata for the report.
const walkable=[...terrain].filter((t,i)=>tilesMeta.get(t).walkable&&prop[i]<0).length;
fs.writeFileSync(new URL('../web/maps/hero-star.json',import.meta.url),JSON.stringify(map));
console.log(JSON.stringify({seed,size:N,walkableTiles:walkable,spawns:spawns.length,monsters:spawns.reduce((a,s)=>a+s.count,0),zones:zoneStats},null,0));
