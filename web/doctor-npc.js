// Vector companion to the ship's existing illustrated robot NPCs.
export function drawDoctor(g,x,y,k,t,ready=false){
 g.save();g.translate(x,y);g.scale(k,k);g.lineJoin='round';g.lineCap='round';
 g.fillStyle='#04111d88';g.beginPath();g.ellipse(0,1,31,10,0,0,7);g.fill();
 const shape=(x,y,w,h,r,color)=>{g.fillStyle=color;g.strokeStyle='#24415a';g.lineWidth=2;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();g.stroke();};
 shape(-20,-22,15,24,5,'#162c44');shape(5,-22,15,24,5,'#162c44');shape(-25,-3,22,7,3,'#0a192c');shape(4,-3,22,7,3,'#0a192c');
 const coat=g.createLinearGradient(-30,-70,30,-25);coat.addColorStop(0,'#c6e6ef');coat.addColorStop(.5,'#f4fdff');coat.addColorStop(1,'#85b8d0');
 shape(-27,-73,54,54,9,coat);g.fillStyle='#1b637b';g.beginPath();g.moveTo(-10,-70);g.lineTo(11,-70);g.lineTo(0,-32);g.closePath();g.fill();
 g.strokeStyle='#9ec6d7';g.beginPath();g.moveTo(-16,-68);g.lineTo(-7,-48);g.lineTo(-17,-43);g.moveTo(16,-68);g.lineTo(7,-48);g.lineTo(17,-43);g.stroke();
 shape(-39,-64,14,35,6,'#e0f4fa');shape(-40,-35,15,13,6,'#edbd91');
 g.save();g.translate(28,-64);g.rotate(-.5+Math.sin(t*4)*.28);shape(-2,-35,14,40,6,'#e1f4fa');shape(-4,-48,17,17,6,'#efc69e');g.strokeStyle='#efc69e';g.lineWidth=5;for(let i=0;i<3;i++){g.beginPath();g.moveTo(i*5-1,-45);g.lineTo(i*5-3,-55-i%2*3);g.stroke();}g.restore();
 g.fillStyle='#d8eef6';for(let i=0;i<9;i++){const a=Math.PI+i*Math.PI/8;g.beginPath();g.ellipse(Math.cos(a)*25,-90+Math.sin(a)*22,11,13,a,0,7);g.fill();}
 shape(-22,-112,44,42,16,'#f1c99f');g.fillStyle='#e9f8ff';g.beginPath();g.ellipse(0,-113,23,11,0,Math.PI,Math.PI*2);g.fill();
 g.strokeStyle='#20405b';g.lineWidth=3;for(const cx of [-11,11]){g.fillStyle='#b8f4ff';g.beginPath();g.ellipse(cx,-94,10,8,0,0,7);g.fill();g.stroke();g.fillStyle='#16394a';g.beginPath();g.arc(cx+1,-94,2.3,0,7);g.fill();}g.beginPath();g.moveTo(-1,-94);g.lineTo(1,-94);g.stroke();
 g.strokeStyle='#a16d55';g.lineWidth=2;g.beginPath();g.arc(1,-86,8,.25,Math.PI-.25);g.stroke();
 shape(9,-48,13,15,2,'#b9dfeb');g.fillStyle='#efc778';g.fillRect(12,-46,7,4);g.fillStyle='#65e8f1';g.beginPath();g.arc(-18,-57,3,0,7);g.fill();
 if(ready){g.fillStyle='#ffe68d';g.font='bold 27px sans-serif';g.textAlign='center';g.fillText('!',0,-140+Math.sin(t*3)*4);}
 g.fillStyle='#091c2eee';g.strokeStyle=ready?'#eac77a':'#709fb4';g.lineWidth=1;g.beginPath();g.roundRect(-52,-134,104,20,6);g.fill();g.stroke();g.fillStyle='#fff1be';g.font='bold 12px GameThai,sans-serif';g.textAlign='center';g.fillText('ดร.ไอสไตร์',0,-120);g.restore();
}
