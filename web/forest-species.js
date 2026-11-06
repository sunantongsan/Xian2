import {t,ui} from './i18n.js';
import {monsterStats} from './balance.js';
// Original Lv.1–60 bestiary: artwork cells and combat signatures share this order.
const DATA=[
 ['ด้วงเขาพลาสมา','Plasma charge','#55e9ff','charge',280,32],
 ['ตั๊กแตนเคียวโฟตอน','Twin photon blades','#ffd45e','twin',230,32],
 ['ผีเสื้อสปอร์เนบิวลา','Spore fan','#d687ff','fan',280,22],
 ['แมงมุมขดลวดอำพัน','Web detonation','#ff965e','web',290,100],
 ['หอยเตาปฏิกรณ์','Reactor ring','#7dff9b','ring',175,70],
 ['หนอนสว่านแมกมา','Drill lance','#ff794b','drill',420,24],
 ['แตนเข็มไทเทเนียม','Needle trident','#ffe267','needles',340,14],
 ['แมงป่องหัวฉีดกรด','Acid spray','#b6ff53','spray',230,100],
 ['ปูปริซึมคราม','Prism cross','#83a9ff','cross',190,36],
 ['แมลงปอไอออน','Ion rail','#65f1ff','rail',500,19],
 ['คางคกแม่เหล็กม่วง','Magnetic pulse','#c99eff','magnet',220,125],
 ['โกเลมเตาหลอม','Furnace rupture','#ff9d59','rupture',300,62],
 ['แมงกะพรุนอาร์กพลาสมา','Six arc discharge','#ffa1f2','arcs',240,20],
 ['ค้างคาวเสียงสะท้อน','Ultrasonic cone','#c4e7ff','sonic',330,160],
 ['งูเห่าเลเซอร์หยก','Twin laser','#92ffab','lasers',390,22],
 ['เต่าปืนใหญ่สุริยะ','Triple artillery','#ffe292','artillery',350,65],
 ['หม้อข้าวนาโนเขี้ยวแดง','Root ambush','#ff8d98','roots',250,95],
 ['อสูรตาแกนแรงโน้มถ่วง','Gravity halo','#b8a2ff','gravity',300,150],
 ['ตะขาบลาวาโลหะ','Magma fault','#ff7356','fault',350,45],
 ['วิหคแสงสุริยะ','Solar star','#fff4ac','solar',290,30]
];
export const FOREST_SPECIES=DATA.map(([name,skillName,color,pattern,range,radius],species)=>({get name(){return t(name);},skillName,color,pattern,range,radius,species,id:1100+species,min:species*3+1,max:species*3+3}));
export function forestMonster(level){const sp=FOREST_SPECIES[Math.min(19,Math.floor((level-1)/3))];return {...sp,get name(){return sp.name;},...monsterStats(level),level,region:Math.floor((level-1)/10),zone:0,art:'forest-v2',slot:sp.species,boss:false,speed:65+(sp.species%5)*7,attack:'signature',cooldown:2.8+(sp.species%4)*.25,xp:20+level*8,gold:10+level*3,hp:monsterStats(level).hp};}
// Canonical attack footprints in WORLD coordinates: consumed by damage, warnings and VFX.
export function monsterZones(e){
 const d=e.def,a=e.angle||0,ux=Math.cos(a),uy=Math.sin(a),o={x:e.x,y:e.y},r=d.range||200,w=d.radius||30;
 const aim={x:e.aimX??e.x+ux*r,y:e.aimY??e.y+uy*r};
 const at=(along,side=0)=>({x:o.x+ux*along-uy*side,y:o.y+uy*along+ux*side});
 const disk=(c,radius,inner=0)=>({type:'disk',...c,radius,inner});
 const lane=(angle,length,width,side=0)=>{const c=at(0,side),x=Math.cos(angle),y=Math.sin(angle);return {type:'poly',points:[[c.x-y*width,c.y+x*width],[c.x+x*length-y*width,c.y+y*length+x*width],[c.x+x*length+y*width,c.y+y*length-x*width],[c.x+y*width,c.y-x*width]]};};
 switch(d.pattern){
 case 'charge':return [lane(a,r,w)];
 case 'twin':return [-.48,.48].map(t=>lane(a+t,r,w));
 case 'fan':return [-.6,-.3,0,.3,.6].map(t=>lane(a+t,r,w));
 case 'web':return [disk(aim,w)];
 case 'ring':return [disk(o,r,w)];
 case 'drill':return [lane(a,r,w),disk(at(r),45)];
 case 'needles':return [-.16,0,.16].map(t=>lane(a+t,r,w));
 case 'spray':case 'sonic':return [{type:'poly',points:[[o.x,o.y],...[-1,1].map(t=>{const p=at(r,t*w);return[p.x,p.y]})]}];
 case 'cross':return [lane(a,r,w),lane(a+Math.PI/2,r,w),lane(a+Math.PI,r,w),lane(a-Math.PI/2,r,w)];
 case 'rail':return [lane(a,r,w)];
 case 'magnet':return [disk(o,w),disk(o,r,r-25)];
 case 'rupture':return [1,2,3].map(i=>disk(at(i*r/3),w));
 case 'arcs':return Array.from({length:6},(_,i)=>lane(a+i*Math.PI/3,r,w));
 case 'lasers':return [-65,65].map(side=>lane(a,r,w,side));
 case 'artillery':return [-1,0,1].map(i=>disk({x:aim.x-uy*i*135,y:aim.y+ux*i*135},w));
 case 'roots':return [disk(o,75),disk(aim,w)];
 case 'gravity':return [disk(aim,w,70)];
 case 'fault':return Array.from({length:5},(_,i)=>disk(at((i+1)*r/5,(i%2?1:-1)*45),w));
 case 'solar':return Array.from({length:8},(_,i)=>lane(a+i*Math.PI/4,r,w));
 default:return [];
 }
}
export function zoneContains(z,p){if(z.type==='disk'){const d=Math.hypot(p.x-z.x,p.y-z.y);return d<=z.radius&&d>=(z.inner||0);}let sign=0;for(let i=0;i<z.points.length;i++){const a=z.points[i],b=z.points[(i+1)%z.points.length],c=(b[0]-a[0])*(p.y-a[1])-(b[1]-a[1])*(p.x-a[0]);if(Math.abs(c)<1e-7)continue;const s=Math.sign(c);if(sign&&s!==sign)return false;sign=s;}return true;}
export function drawMonsterZones(g,zones,project,scale,color,alpha=.2){g.save();g.fillStyle=color;g.strokeStyle=color;g.lineWidth=1.5*scale;for(const z of zones){g.beginPath();if(z.type==='disk'){for(const [radius,reverse]of [[z.radius,false],[z.inner,true]]){if(!radius)continue;for(let i=0;i<=48;i++){const a=i/48*Math.PI*2*(reverse?-1:1),p=project(z.x+Math.cos(a)*radius,z.y+Math.sin(a)*radius);i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);}g.closePath();}}else{z.points.forEach(([x,y],i)=>{const p=project(x,y);i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);});g.closePath();}g.globalAlpha=alpha;g.fill('evenodd');g.globalAlpha=Math.min(1,alpha*3);g.stroke();}g.restore();}
