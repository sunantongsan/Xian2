import {ADVANCED_SPECIES} from './advanced-monsters.js';
const contactOffset={moth:6,wasp:-10,dragonfly:3,bat:-5,phoenix:-6,jelly:-5,worm:2,toad:-2,serpent:-5,centipede:-1};
// Vector creatures use independent silhouettes, articulated limbs and glowing markings.
// Local coordinates are 100 units tall, anchored at the feet; no sprite downloads needed.
export function drawAdvancedMonster(g,e,x,y,size,time=0){
 const sp=ADVANCED_SPECIES[e.def.species];if(!sp)return;
 const phase=(e.walkDistance||0)/22,timePhase=time*3+sp.species,step=e.moving?Math.sin(phase)*5:0;
 const cast=e.state==='windup'?1+Math.sin(time*18)*.05:1,dead=e.hp<=0;
 g.save();g.translate(x,y);g.scale(size/100*(e.face<0?-1:1),size/100);g.lineJoin='round';g.lineCap='round';g.lineWidth=2.2;g.strokeStyle='#172633';
 if(dead){g.rotate(-.28);g.scale(1,.65);}else g.scale(cast,cast);
 // Keep a planted limb under the body throughout each stride. Winged species
 // use a small, species-specific clearance measured from their lowest visible point.
 const offset=contactOffset[sp.form]||0;
 g.translate(0,offset);
 const shade=g.createLinearGradient(-25,-90,35,-5);shade.addColorStop(0,sp.accent);shade.addColorStop(.3,sp.color);shade.addColorStop(1,'#202938');
 const oval=(cx,cy,rx,ry,fill=shade,rot=0)=>{g.fillStyle=fill;g.beginPath();g.ellipse(cx,cy,rx,ry,rot,0,Math.PI*2);g.fill();g.stroke();};
 const path=(points,fill=shade)=>{g.beginPath();g.moveTo(...points[0]);points.slice(1).forEach(p=>g.lineTo(...p));g.closePath();g.fillStyle=fill;g.fill();g.stroke();};
 const line=(pts,color=sp.accent,width=3)=>{g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(...pts[0]);pts.slice(1).forEach(p=>g.lineTo(...p));g.stroke();g.strokeStyle='#172633';g.lineWidth=2.2;};
 const eye=(cx,cy,r=4)=>{oval(cx,cy,r+1,r+1,'#11202c');oval(cx+1,cy-1,r,r,dead?'#536777':sp.accent);if(!dead)oval(cx+2,cy-2,1.2,1.2,'#fff');};
 const legs=(n,w=28,base=-29)=>{
  for(const side of [-1,1])for(let i=0;i<n;i++){
   const gait=e.moving?Math.sin(phase+i*Math.PI)*side:0;
   const lift=Math.max(0,gait)*6,h=base-i*12;
   const joints=[[side*14,h],[side*(w+7),h+8-lift*.5],[side*(w+14)+gait*4,-3-i*5-lift]];
   line(joints,'#192b35',7);line(joints,sp.color,4);
  }
 };
 const wings=(n=2,wide=42)=>{for(let side of [-1,1])for(let i=0;i<n;i++){const cy=-57+i*20,flap=Math.sin(time*12)*5;oval(side*(wide*.6),cy,wide,12+i*5,sp.accent+'b8',side*(.4+flap*.025));line([[0,cy],[side*wide,cy-8]],sp.color,1.4);}};
 const face=(cy=-62,rx=16,ry=13)=>{oval(0,cy,rx,ry);eye(-rx*.45,cy-2,3);eye(rx*.45,cy-2,3);line([[-6,cy+7],[0,cy+10],[6,cy+7]],'#172633',2);};
 const horn=(sx,sy,dir=1)=>path([[sx,sy],[sx+dir*8,sy-22],[sx+dir*13,sy+3]],sp.accent);
 const feet=()=>{for(let side of [-1,1])oval(side*15+step*.4,-7-Math.max(0,side*step),13,6);};
 const form=sp.form;
 if(form==='beetle'){legs(3,22);oval(0,-39,26,32);line([[0,-67],[0,-13]],sp.accent,2);face(-70,19,13);horn(0,-81,1);for(const s of [-1,1])oval(s*13,-40,5,10,sp.accent);}
 if(form==='mantis'){legs(2,18,-20);oval(0,-39,12,29);for(const s of [-1,1]){line([[s*10,-56],[s*30,-73+step],[s*39,-45+step]],sp.color,7);path([[s*39,-45+step],[s*20,-35+step],[s*35,-62+step]],sp.accent);}path([[-19,-79],[19,-79],[0,-58]]);eye(-11,-75);eye(11,-75);}
 if(form==='moth'){wings(2,34);for(const s of [-1,1]){oval(s*26,-51,10,13,sp.color);eye(s*26,-51,5);}oval(0,-42+step,9,27);face(-70+step,11,10);line([[-5,-78],[-13,-94]],sp.accent,2);line([[5,-78],[13,-94]],sp.accent,2);}
 if(form==='spider'){legs(4,28,-21);oval(0,-43,26,24);oval(0,-66,17,13);for(let i=-1;i<=1;i++)eye(i*10,-68,3);for(let s of [-1,1])path([[s*6,-57],[s*16,-48],[s*4,-49]],sp.accent);oval(0,-42,9,10,sp.accent);}
 if(form==='snail'){oval(0,-10,38,10);oval(-10,-36,29,30);g.strokeStyle=sp.accent;g.lineWidth=4;g.beginPath();for(let a=0;a<Math.PI*5;a+=.12){const r=1+a*1.2;g.lineTo(-10+Math.cos(a)*r,-36+Math.sin(a)*r);}g.stroke();g.strokeStyle='#172633';oval(25,-29+step,11,23);for(let s of [-1,1]){line([[25+s*4,-45],[25+s*9,-61]],sp.color,4);eye(25+s*9,-62,4);}}
 if(form==='worm'){for(let i=5;i>=0;i--)oval(-25+i*9,-15-i*8+(i?Math.sin(timePhase+i)*3:0),15-i,12);oval(20,-65,19,18);for(let s of [-1,1])horn(20+s*12,-76,s);eye(13,-69);eye(27,-69);path([[7,-56],[12,-43],[17,-56],[23,-43],[30,-56]],sp.accent);}
 if(form==='wasp'){wings(1,29);legs(3,19,-32);oval(0,-31+step,17,25);for(let i=0;i<3;i++)line([[-12,-20-i*11],[12,-20-i*11]],'#292c39',5);path([[-5,-10],[0,4],[5,-10]],sp.accent);face(-65,17,15);line([[-8,-77],[-16,-91],[ -22,-87]],sp.accent,2);line([[8,-77],[16,-91],[22,-87]],sp.accent,2);}
 if(form==='scorpion'){legs(3,23,-17);line([[0,-36],[-9,-61],[-4,-87],[14,-94],[25,-80]],sp.color,13);path([[20,-82],[30,-66],[30,-87]],sp.accent);oval(0,-29,22,19);for(let s of [-1,1]){line([[s*18,-24],[s*34,-40]],sp.color,8);oval(s*38,-44,10,15);line([[s*38,-58],[s*38,-44]],sp.accent,3);}eye(-8,-28);eye(8,-28);}
 if(form==='crab'){legs(3,25,-19);oval(0,-34,27,22);for(let s of [-1,1]){line([[s*22,-37],[s*38,-56]],sp.color,9);path([[s*33,-51],[s*29,-77],[s*42,-68],[s*49,-79],[s*51,-53]],sp.accent);eye(s*10,-50);}path([[-10,-48],[0,-78],[11,-48]],sp.accent);}
 if(form==='dragonfly'){wings(2,37);for(let i=0;i<5;i++)oval(0,-15-i*8,4+i*.6,6);oval(0,-57,9,14);face(-75,15,12);for(let s of [-1,1])line([[s*7,-51],[s*17,-34],[s*24,-32]],sp.color,3);}
 if(form==='toad'){for(let s of [-1,1]){oval(s*24,-16,16,13);oval(s*30,-4,15,5);}oval(0,-32+step,31,26);oval(0,-28+step,20,15,sp.accent);for(let s of [-1,1]){oval(s*19,-54+step,12,12);eye(s*19,-56+step,6);}line([[-20,-40+step],[0,-35+step],[20,-40+step]],'#223341',3);for(let i=0;i<3;i++)oval(i*12-12,-66,3,3,sp.accent);}
 if(form==='golem'){feet();for(let s of [-1,1]){path([[s*11,-57],[s*35,-51],[s*40,-23],[s*24,-18],[s*17,-35]]);oval(s*35,-20+step,12,11);}path([[-21,-62],[20,-62],[24,-27],[0,-17],[-23,-27]]);path([[-14,-82],[12,-86],[19,-65],[-17,-63]]);eye(-6,-72);eye(6,-72);path([[-8,-48],[0,-59],[10,-48],[0,-31]],sp.accent);line([[-16,-34],[-5,-40]],sp.accent,2);}
 if(form==='jelly'){for(let i=0;i<6;i++){const xx=i*9-23;line([[xx,-39],[xx+Math.sin(timePhase+i)*8,-23],[xx-4,-7+Math.sin(timePhase+i)*5]],sp.accent,4);}oval(0,-59+step,31,25);oval(0,-46+step,31,9,sp.accent);eye(-9,-58+step);eye(9,-58+step);oval(0,-76+step,8,4,'#ffffff99');}
 if(form==='bat'){for(let s of [-1,1])path([[s*8,-58],[s*32,-83+step],[s*51,-42],[s*32,-49],[s*24,-28],[s*13,-39]],shade);oval(0,-39,13,24);face(-66,15,14);for(let s of [-1,1])path([[s*5,-77],[s*17,-98],[s*18,-72]],sp.accent);eye(-7,-67);eye(7,-67);feet();}
 if(form==='serpent'){line([[-32,-5],[-4,-12],[17,-30],[-7,-46],[9,-63]],'#162b32',20);line([[-32,-5],[-4,-12],[17,-30],[-7,-46],[9,-63]],sp.color,15);oval(9,-69,18,16);eye(1,-73);eye(17,-73);for(let s of [-1,1])path([[9+s*8,-57],[9+s*6,-45],[9+s*3,-57]],sp.accent);line([[9,-54],[9,-45],[4,-41]],'#ff799a',2);}
 if(form==='turtle'){feet();oval(0,-31,33,27);path([[-18,-42],[0,-56],[18,-42],[18,-24],[0,-14],[-18,-24]],sp.accent);for(let s of [-1,1]){line([[s*18,-24],[s*30,-17]],sp.accent,2);path([[s*18,-53],[s*25,-76],[s*30,-49]],sp.accent);}face(-20,13,11);}
 if(form==='plant'){for(let s of [-1,1])path([[0,-14],[s*42,-31],[s*24,-4],[0,0]],sp.color);line([[0,-13],[5,-40],[0,-62]],sp.color,14);oval(0,-59+step,27,24);oval(0,-65+step,21,12,'#192337');for(let i=0;i<7;i++)path([[-21+i*6,-68+step],[-18+i*6,-59+step],[-15+i*6,-68+step]],sp.accent);for(let s of [-1,1])eye(s*18,-79+step,4);}
 if(form==='cyclops'){feet();for(let s of [-1,1]){oval(s*26,-44+step,11,24);oval(s*30,-20+step,13,11);}oval(0,-41,23,29);oval(0,-71,23,22);eye(0,-73,12);for(let s of [-1,1])horn(s*18,-79,s);path([[-7,-52],[0,-45],[7,-52]],sp.accent);}
 if(form==='centipede'){for(let i=6;i>=0;i--){const xx=(i-3)*9,yy=-12-i*9+(i?Math.sin(timePhase+i)*2:0);for(let s of [-1,1])line([[xx,yy],[xx+s*14,yy+3],[xx+s*19,yy+11]],sp.accent,3);oval(xx,yy,12,9);}oval(27,-77,16,15);eye(21,-80);eye(33,-80);for(let s of [-1,1])horn(27+s*10,-87,s);}
 if(form==='phoenix'){for(let s of [-1,1]){for(let i=3;i>=0;i--)path([[s*8,-56],[s*(49-i*6),-89+i*16+step],[s*(25-i*4),-36+i*5]],i%2?sp.accent:shade);path([[s*7,-26],[s*23,0],[s*3,-8]],sp.accent);}oval(0,-44,13,24);face(-70,12,13);path([[-5,-65],[0,-52],[7,-65]],'#ffce57');for(let i=-1;i<=1;i++)path([[i*5,-80],[i*9,-103+Math.sin(timePhase+i)*3],[i*5+5,-81]],sp.accent);}
 // Shared small highlights make the twenty silhouettes read in the painted world.
 if(e.def.boss){g.strokeStyle='#ffdf88';g.lineWidth=2;g.beginPath();g.ellipse(0,-91,22,6,0,0,Math.PI*2);g.stroke();}
 g.restore();
}

