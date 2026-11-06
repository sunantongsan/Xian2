// Runtime for Tiled tile maps (used by ดาวฮีโร่): parsing, collision and A* routing on the tile grid.
// World units: tile (c,r) covers x∈[c*T,(c+1)*T], y∈[r*T,(r+1)*T]; actors use the same isometric projection as painted maps.
import {STAR_ZONES} from './star-data.js';

const props=o=>Object.fromEntries((o?.properties||[]).map(p=>[p.name,p.value]));

export function parseTiled(json){
 const N=json.width,rows=json.height,mp=props(json),T=mp.tileWorld||48;
 if(json.orientation!=='isometric'||!N||!rows)throw new Error('ต้องเป็นแผนที่ Tiled แบบ isometric');
 const layer=name=>json.layers.find(l=>l.name===name);
 const sets=[...json.tilesets].sort((a,b)=>b.firstgid-a.firstgid);
 const tileOf=gid=>{if(!gid)return null;const ts=sets.find(t=>gid>=t.firstgid);if(!ts)return null;const id=gid-ts.firstgid,meta=ts.tiles?.find(t=>t.id===id);return {set:ts.name,id,...props(meta)};};
 const cache=new Map(),info=gid=>{if(!cache.has(gid))cache.set(gid,tileOf(gid));return cache.get(gid);};
 const count=N*rows,kind=new Array(count),color=new Array(count),walk=new Uint8Array(count),prop=new Array(count).fill(null),zone=new Int8Array(count).fill(-1),variant=new Uint8Array(count);
 const ground=layer('ground').data,pl=layer('props')?.data||[],zl=layer('zones')?.data||[];
 for(let i=0;i<count;i++){
  const g=info(ground[i])||{kind:'void',walkable:false};kind[i]=g.kind;color[i]=g.color||null;walk[i]=g.walkable?1:0;variant[i]=g.kind==='ground'&&(g.id-5)%3===1?1:0;
  const pr=info(pl[i]);if(pr){
   const c=i%N,row=Math.floor(i/N);let nearRoute=false;
   for(let dy=-2;dy<=2&&!nearRoute;dy++)for(let dx=-2;dx<=2;dx++){const x=c+dx,y=row+dy;if(x<0||y<0||x>=N||y>=rows)continue;if(['road','bridge','plaza'].includes(info(ground[y*N+x])?.kind)){nearRoute=true;break;}}
   // Deterministic 35% retention, shared by server/client; never open unsafe ground.
   const keep=((Math.imul(c+1,73856093)^Math.imul(row+1,19349663))>>>0)%100<35;
   if(!g.walkable||(!nearRoute&&keep)){prop[i]=pr.kind;walk[i]=0;}
  }
  const z=info(zl[i]);if(z)zone[i]=z.id;if(g.zone>=0&&zone[i]<0)zone[i]=g.zone;
 }
 const zoneSet=json.tilesets.find(t=>t.name==='hero-star-zones');
 const zones=(zoneSet?.tiles||[]).sort((a,b)=>a.id-b.id).map(t=>{const p=props(t);return {...STAR_ZONES[t.id],name:p.name,en:p.en,min:p.minLevel,max:p.maxLevel};});
 const toW=o=>({x:o.x/json.tileheight*T,y:o.y/json.tileheight*T});
 const spawns=(layer('spawns')?.objects||[]).map(o=>{const p=props(o);return {id:o.id,name:o.name,...toW(o),zone:p.zone,level:p.level,species:p.species,count:p.count||1,elite:o.type==='elite'||o.type==='boss',boss:o.type==='boss'};});
 const pois=(layer('pois')?.objects||[]).map(o=>{const p=props(o);return {id:o.id,name:o.name,action:o.type,zone:p.zone,world:toW(o)};});
 const gate=pois.find(p=>p.action==='warp'&&p.zone===0)||pois[0];
 return {type:'tiles',name:mp.title||'แผนที่',N,rows,T,kind,color,walk,prop,zone,variant,zones,spawns,pois,spawn:gate.world};
}

export const tileIndex=(scene,x,y)=>{const c=Math.floor(x/scene.T),r=Math.floor(y/scene.T);return c<0||r<0||c>=scene.N||r>=scene.rows?-1:r*scene.N+c;};
export const tileCenter=(scene,i)=>({x:(i%scene.N+.5)*scene.T,y:(Math.floor(i/scene.N)+.5)*scene.T});
export const zoneAt=(scene,p)=>{const i=tileIndex(scene,p.x,p.y);return i<0?-1:scene.zone[i];};
const open=(scene,x,y)=>{const i=tileIndex(scene,x,y);return i>=0&&scene.walk[i]===1;};
// A small body radius keeps actors from hugging chasm edges and from clipping diagonal corners.
export function tileWalkable(scene,{x,y}){const r=7;return open(scene,x,y)&&open(scene,x+r,y)&&open(scene,x-r,y)&&open(scene,x,y+r)&&open(scene,x,y-r);}

function nearestOpen(scene,p,max=8){const c0=Math.floor(p.x/scene.T),r0=Math.floor(p.y/scene.T);let best=-1,bd=Infinity;for(let dr=-max;dr<=max;dr++)for(let dc=-max;dc<=max;dc++){const c=c0+dc,r=r0+dr;if(c<0||r<0||c>=scene.N||r>=scene.rows)continue;const i=r*scene.N+c;if(!scene.walk[i])continue;const d=dc*dc+dr*dr;if(d<bd){bd=d;best=i;}}return best;}

// Binary-heap A* on 8-connected tiles without corner cutting. With `limit`, returns the route to the closest explored tile.
export function tileRoute(scene,from,to,limit=60000,trace){
 const N=scene.N,W=scene.walk,start=nearestOpen(scene,from),goal=nearestOpen(scene,to);if(start<0||goal<0)return[];
 const g=new Map([[start,0]]),par=new Map(),closed=new Set(),heap=[[0,start]];const gc=goal%N,gr=Math.floor(goal/N);
 const h=i=>{const dx=Math.abs(i%N-gc),dy=Math.abs(Math.floor(i/N)-gr);return Math.max(dx,dy)+.414*Math.min(dx,dy);};
 const push=n=>{heap.push(n);let k=heap.length-1;while(k){const p=(k-1)>>1;if(heap[p][0]<=heap[k][0])break;[heap[p],heap[k]]=[heap[k],heap[p]];k=p;}};
 const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let k=0;for(;;){const a=2*k+1,b=a+1;let m=k;if(a<heap.length&&heap[a][0]<heap[m][0])m=a;if(b<heap.length&&heap[b][0]<heap[m][0])m=b;if(m===k)break;[heap[m],heap[k]]=[heap[k],heap[m]];k=m;}}return top;};
 let end=-1,closest=start,ch=h(start),n=0;
 while(heap.length){const [,cur]=pop();if(closed.has(cur))continue;if(cur===goal){end=goal;break;}closed.add(cur);if(++n>limit)break;const hc=h(cur);if(hc<ch){ch=hc;closest=cur;}
  const c=cur%N,r=Math.floor(cur/N);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const x=c+dx,y=r+dy;if(x<0||y<0||x>=N||y>=scene.rows)continue;const j=y*N+x;if(!W[j]||closed.has(j))continue;if(dx&&dy&&(!W[r*N+x]||!W[y*N+c]))continue;
   const ng=g.get(cur)+(dx&&dy?1.414:1);if(ng<(g.get(j)??Infinity)){g.set(j,ng);par.set(j,cur);push([ng+h(j),j]);}}}
 if(end<0)end=closest;
 const ids=[end];while(ids[0]!==start)ids.unshift(par.get(ids[0]));
 const pts=ids.map(i=>tileCenter(scene,i));if(end===goal&&tileWalkable(scene,to))pts.push({x:to.x,y:to.y});
 // String-pull: keep only waypoints that are needed for a clear straight segment.
 if(!trace||pts.length<3)return pts.slice(1).length?pts.slice(1):pts;
 const out=[];let anchor={x:from.x,y:from.y},k=0;
 while(k<pts.length){let far=k;for(let m=Math.min(pts.length-1,k+24);m>k;m--){const e=trace(scene,anchor,pts[m]);if(Math.hypot(e.x-pts[m].x,e.y-pts[m].y)<1){far=m;break;}}out.push(pts[far]);anchor=pts[far];k=far+1;}
 return out;
}

