// Battlefield coordinates stay constant across mobile orientations.
export const roster=[
 {name:'องครักษ์แมงสาบ',short:'องครักษ์',skill:'ดาบสะเทือน',file:'cockroach-male',color:'#ffc35e',reach:135,damage:20,rate:.82,area:83},
 {name:'นักธนูแมงปอ',short:'นักธนู',skill:'ฝนศร',file:'dragonfly-female',color:'#79e9ff',reach:205,damage:12,rate:.57,area:102},
 {name:'จอมพิษแมงป่อง',short:'จอมพิษ',skill:'ระเบิดพิษ',file:'scorpion-male',color:'#d79bff',reach:158,damage:16,rate:.77,area:95}
];
export const maps=[
 {name:'อ่าวแก้วมรกต',path:[[-28,146],[91,146],[180,210],[283,210],[377,135],[488,135],[563,225],[684,225],[812,142]],pads:[[170,136],[309,267],[506,205],[642,156],[390,202]],waves:3},
 {name:'สวนปีกแก้ว',squad:true,path:[[-20,236],[112,236],[210,131],[365,131],[446,213],[572,213],[648,117],[812,117]],pads:[[155,161],[320,190],[481,146],[650,204],[355,79]],waves:4},
 {name:'ประตูราชัน',path:[[-20,124],[124,124],[201,216],[321,216],[420,120],[530,120],[619,217],[812,217]],pads:[[165,161],[291,150],[465,183],[633,144],[737,269]],waves:4}
];
const distance=(x,y,p)=>Math.hypot(p.x-x,p.y-y);
export function battle(index=0,ranks=[0,0,0],guide=true){
 const m=maps[index],path=m.path.map(([x,y])=>({x,y}));let total=0;
 for(let i=1;i<path.length;i++){total+=distance(path[i-1].x,path[i-1].y,path[i]);path[i].end=total;}
 return {index,ranks:[...ranks],path,total,units:[],foes:[],effects:[],coins:75,hp:10,wave:0,spawned:0,next:0,elapsed:0,phase:'setup',guide:guide?'pad':'',kills:0};
}
export function place(r,pad,id){
 if(!['setup','fight','break'].includes(r.phase)||!maps[r.index].pads[pad]||!roster[id]||r.units.some(u=>u.pad===pad||u.id===id)||r.coins<25)return false;
 if(maps[r.index].squad&&r.phase==='fight')return false;
 if(r.guide==='pad'&&(pad!==0||id!==0))return false;
 const [x,y]=maps[r.index].pads[pad];r.units.push({pad,id,x,y,cd:0,energy:100,attack:0,face:1});r.coins-=25;
 if(r.guide==='pad')r.guide='wave';return true;
}
export function wave(r){
 if(!['setup','break'].includes(r.phase)||!r.units.length)return false;
 r.wave++;r.phase='fight';r.next=.12;r.spawned=0;r.count=4+r.wave+r.index;r.elapsed=0;
 if(maps[r.index].squad){
  for(const [i,u] of r.units.entries()){
   u.maxHp=135+r.ranks[u.id]*20;u.hp=u.maxHp;
   u.x=153-i*25;u.y=130+i*40;
  }
 }
 if(r.guide==='wave')r.guide='watch';return true;
}
export function locate(r,d){
 let prev=r.path[0],base=0;
 for(const p of r.path.slice(1)){if(d<=p.end){const t=Math.max(0,(d-base)/(p.end-base));return {x:prev.x+(p.x-prev.x)*t,y:prev.y+(p.y-prev.y)*t,face:p.x>=prev.x?1:-1};}prev=p;base=p.end;}
 return {...prev,face:1};
}
function hit(r,e,n){if(e.hp<=0)return;e.hp=Math.max(0,e.hp-n);e.flash=.13;if(!e.hp){r.kills++;r.coins+=3;}}
export function cast(r,id,x,y){
 const u=r.units.find(h=>h.id===id);if(r.phase!=='fight'||!u||u.hp===0||u.energy<99.99||!Number.isFinite(x)||!Number.isFinite(y))return false;
 const targets=r.foes.filter(e=>e.hp>0&&distance(x,y,e)<=roster[id].area);
 if(r.guide==='aim'&&!targets.length)return false;
 u.energy=0;u.attack=.34;r.effects.push({kind:'nova',id,x,y,t:.58,max:.58});for(const e of targets){hit(r,e,60+12*r.ranks[id]);if(id===2)e.slow=3;}
 if(r.guide==='aim')r.guide='';return true;
}
export function tick(r,dt){
 for(const f of r.effects)f.t-=dt;r.effects=r.effects.filter(f=>f.t>0);
 if(r.phase!=='fight'||r.guide==='aim')return;
 r.next-=dt;r.elapsed+=dt;
 if(r.next<=0&&r.spawned<r.count){
  const boss=r.wave===maps[r.index].waves&&r.spawned===r.count-1;
  const hp=(32+r.index*8+r.wave*6)*(boss?4.2:1);
  r.foes.push({d:0,...locate(r,0),hp,max:hp,boss,type:boss?2:r.spawned%3,slow:0,flash:0});if(maps[r.index].squad){const e=r.foes.at(-1);e.x=703;e.y=113+(r.spawned%3)*53;e.cd=1;e.d=1;}
  r.spawned++;r.next=.95;
 }
 const team=maps[r.index].squad;
 for(const e of r.foes){
  if(e.hp<=0)continue;e.flash-=dt;e.slow-=dt;
  if(team){
   const friend=closest(e,r.units.filter(u=>u.hp>0));if(!friend)continue;
   e.cd-=dt;if(distance(e.x,e.y,friend)>30)walk(e,friend,dt*(e.slow>0?18:38));
   else if(e.cd<=0){e.cd=1.25;friend.hp=Math.max(0,friend.hp-(e.boss?14:6));r.effects.push({kind:'strike',id:0,x:e.x,y:e.y-8,tx:friend.x,ty:friend.y-8,t:.18,max:.18});}
  }else{e.d+=dt*(e.boss?38:53+r.index*2)*(e.slow>0?.55:1);Object.assign(e,locate(r,e.d));if(e.d>=r.total){e.hp=0;r.hp=Math.max(0,r.hp-(e.boss?4:1));}}
 }
 if(team&&!r.units.some(u=>u.hp>0)){r.phase='lost';return;}
 for(const u of r.units){
  if(team&&u.hp===0)continue;
  if(team){const e=closest(u,r.foes.filter(e=>e.hp>0));if(e&&distance(u.x,u.y,e)>[42,166,95][u.id])walk(u,e,dt*(u.id===0?67:51));}
  u.energy=Math.min(100,u.energy+dt*3);u.cd-=dt;u.attack-=dt;
  const spec=roster[u.id];const target=r.foes.filter(e=>e.hp>0&&distance(u.x,u.y,e)<=(team?[48,180,102][u.id]:spec.reach)).sort((a,b)=>b.d-a.d)[0];
  if(!target||u.cd>0)continue;
  u.face=target.x>=u.x?1:-1;u.cd=spec.rate;u.attack=.23;u.energy=Math.min(100,u.energy+3);
  r.effects.push({kind:'strike',id:u.id,x:u.x,y:u.y-15,tx:target.x,ty:target.y-12,t:.23,max:.23});
  hit(r,target,spec.damage+r.ranks[u.id]*3);if(u.id===2)target.slow=1;
 }
 r.foes=r.foes.filter(e=>e.hp>0);
 if(!r.hp){r.phase='lost';return;}
 if(r.guide==='watch'&&r.foes.some(e=>e.d>95))r.guide='aim';
 if(r.spawned===r.count&&!r.foes.length){if(team){for(const u of r.units){if(u.hp===0)r.hp=Math.max(1,r.hp-1);[u.x,u.y]=maps[r.index].pads[u.pad];}}r.phase=r.wave===maps[r.index].waves?'won':'break';}
}

function closest(actor,others){return others.reduce((best,p)=>!best||distance(actor.x,actor.y,p)<distance(actor.x,actor.y,best)?p:best,null);}
function walk(a,b,amount){const d=distance(a.x,a.y,b);if(d<1)return;const k=Math.min(1,amount/d);a.x+=(b.x-a.x)*k;a.y+=(b.y-a.y)*k;a.face=b.x<a.x?-1:1;}
