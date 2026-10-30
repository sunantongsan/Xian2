// Ground geometry is authored against the actual alien map, not the retired village.
// Tile maps (type 'tiles', e.g. ดาวฮีโร่) are handled by tilemap.js.
import {BUFF_NPC_UV} from './town-buff.js';
import {tileWalkable,tileRoute} from './tilemap.js';
export const MAP_W=2000,MAP_H=1333;
export const mapSize=scene=>({width:scene?.width||MAP_W,height:scene?.height||MAP_H});
export const toWorld=([u,v],scene)=>{const {width,height}=mapSize(scene),a=(u-.5)*width/.8,b=(v-.6)*height/.4;return{x:(a+b)/2,y:(b-a)/2}};
export const toUV=({x,y},scene)=>{const {width,height}=mapSize(scene);return[.5+.8*(x-y)/width,.6+.4*(x+y)/height]};
const rect=(l,t,r,b)=>[[l,t],[r,t],[r,b],[l,b]];
// Each 1600x1600 world tile uses its own detailed texture instead of enlarging one small overview.
export const FOREST_COLS=9,FOREST_ROWS=6;
const localPoly=(col,row,poly)=>poly.map(([u,v])=>[(col+u)/FOREST_COLS,(row+v)/FOREST_ROWS]);
const forestWalk=[];
for(let row=0;row<FOREST_ROWS;row++)for(let col=0;col<FOREST_COLS;col++){
 forestWalk.push(localPoly(col,row,[[.22,.4],[.34,.27],[.64,.27],[.77,.40],[.78,.58],[.65,.73],[.35,.73],[.22,.59]]));
 forestWalk.push(localPoly(col,row,rect(.40,row===0?.045:0,.58,row===FOREST_ROWS-1?.96:1)));
 forestWalk.push(localPoly(col,row,rect(col===0?.045:0,.42,col===FOREST_COLS-1?.955:1,.54)));
}
export const REGIONS=[
 {id:0,name:'ชายป่าแสงแรก',min:1,max:10,center:[1/6,.75],entry:[1/6,.90]},
 {id:1,name:'ทุ่งสปอร์อำพัน',min:11,max:20,center:[.50,.75],entry:[.50,.90]},
 {id:2,name:'สวนรากคริสตัล',min:21,max:30,center:[5/6,.75],entry:[5/6,.90]},
 {id:3,name:'ดงบุปผากินพลัง',min:31,max:40,center:[5/6,.25],entry:[5/6,.40]},
 {id:4,name:'แอ่งชีวะแสง',min:41,max:50,center:[.50,.25],entry:[.50,.40]},
 {id:5,name:'หัวใจป่าดาวไกล',min:51,max:60,center:[1/6,.25],entry:[1/6,.40]}
];
export const MAPS={
 town:{id:'town',name:'หมู่บ้านฮีโร่ • สถานีออโรรา',image:'maps/aurora-outpost.webp',width:2000,height:1333,spawn:[.50,.59],walk:[rect(.31,.43,.69,.75),rect(.24,.48,.76,.59),rect(.45,.33,.55,.83)],pois:[{uv:BUFF_NPC_UV,name:'AURA-01 • รับบัฟ 1 ชั่วโมง',action:'buff'},{uv:[.27,.54],name:'คลังเสบียง',action:'shop'},{uv:[.73,.54],name:'โรงอัปเกรด',action:'forge'},{uv:[.50,.37],name:'ศูนย์ฝึกฮีโร่',action:'skills'},{uv:[.50,.79],name:'ประตูป่าชีวะแสง • Lv.1–60',action:'forest'},{uv:[.64,.70],name:'ยานสู่ดาวฮีโร่ • Lv.61–120',action:'star'}]},
 forest:{id:'forest',name:'ป่าชีวะแสง • Lv.1–60',image:'maps/biolume-tile.webp',tiled:true,cols:FOREST_COLS,rows:FOREST_ROWS,width:14400,height:9600,spawn:[1/6,.935],walk:forestWalk,pois:[{uv:[1/6,.935],name:'กลับสถานีออโรรา',action:'town'},...REGIONS.map(r=>({uv:r.entry,name:r.name+' • '+r.min+'–'+r.max,action:'waypoint',region:r.id}))]}

};
export function regionAt(point){const [u,v]=toUV(point,MAPS.forest);return REGIONS.reduce((best,r)=>Math.hypot(u-r.center[0],v-r.center[1])<Math.hypot(u-best.center[0],v-best.center[1])?r:best,REGIONS[0]);}
function inside(u,v,poly){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>v)!==(b[1]>v)&&u<(b[0]-a[0])*(v-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
export function walkable(scene,point){if(scene?.type==='tiles')return tileWalkable(scene,point);if(!scene)return Math.abs(point.x)<=850&&Math.abs(point.y)<=850;const [u,v]=toUV(point,scene);return [[0,0],[.0015,0],[-.0015,0],[0,.0015],[0,-.0015]].every(([du,dv])=>scene.walk.some(poly=>inside(u+du,v+dv,poly)));}
export function traceStep(scene,from,to){const d=Math.hypot(to.x-from.x,to.y-from.y),steps=Math.max(1,Math.ceil(d/10));let p={x:from.x,y:from.y};for(let i=1;i<=steps;i++){const q={x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps};if(!walkable(scene,q))break;p=q;}return p;}
const COLS=120,ROWS=80,cache=new WeakMap();
function grid(scene){if(cache.has(scene))return cache.get(scene);const cells=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)cells.push(walkable(scene,toWorld([(x+.5)/COLS,(y+.5)/ROWS],scene)));cache.set(scene,cells);return cells;}
const cellWorld=(id,scene)=>toWorld([(id%COLS+.5)/COLS,(Math.floor(id/COLS)+.5)/ROWS],scene);
function nearest(scene,p){const [u,v]=toUV(p,scene),g=grid(scene);let best=-1,dist=Infinity;for(let i=0;i<g.length;i++)if(g[i]){const d=((i%COLS+.5)/COLS-u)**2+((Math.floor(i/COLS)+.5)/ROWS-v)**2;if(d<dist){dist=d;best=i;}}return best;}
export function routeTo(scene,from,to,limit){if(!scene)return[to];if(scene.type==='tiles')return tileRoute(scene,from,to,limit,traceStep);const direct=traceStep(scene,from,to);if(walkable(scene,to)&&Math.hypot(direct.x-to.x,direct.y-to.y)<.5)return[to];const g=grid(scene),start=nearest(scene,from),goal=nearest(scene,to);if(start<0||goal<0)return[];const open=[start],cost=new Map([[start,0]]),parent=new Map(),closed=new Set();const heuristic=id=>Math.hypot(id%COLS-goal%COLS,Math.floor(id/COLS)-Math.floor(goal/COLS));while(open.length){let bi=0;for(let i=1;i<open.length;i++)if(cost.get(open[i])+heuristic(open[i])<cost.get(open[bi])+heuristic(open[bi]))bi=i;const cur=open.splice(bi,1)[0];if(cur===goal){const ids=[goal];while(ids[0]!==start)ids.unshift(parent.get(ids[0]));const route=ids.map(id=>cellWorld(id,scene));if(walkable(scene,to)&&Math.hypot(traceStep(scene,route.at(-1),to).x-to.x,traceStep(scene,route.at(-1),to).y-to.y)<1)route.push(to);return route;}
 closed.add(cur);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const x=cur%COLS+dx,y=Math.floor(cur/COLS)+dy,n=y*COLS+x;if(x<0||x>=COLS||y<0||y>=ROWS||!g[n]||closed.has(n))continue;if(dx&&dy&&(!g[cur+dx]||!g[cur+dy*COLS]))continue;const next=cellWorld(n,scene),end=traceStep(scene,cellWorld(cur,scene),next);if(Math.hypot(end.x-next.x,end.y-next.y)>.5)continue;const c=cost.get(cur)+Math.hypot(dx,dy);if(c<(cost.get(n)??Infinity)){cost.set(n,c);parent.set(n,cur);if(!open.includes(n))open.push(n);}}
 }return[];}




