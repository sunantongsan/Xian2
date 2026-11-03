// Lightweight vector NPC: no per-frame image allocation or blurred shadows.
export function drawForgeRobot(c,x,y,k,t){
 c.save();c.translate(x,y);c.scale(k,k);
 c.fillStyle='#06152199';c.beginPath();c.ellipse(0,2,42,12,0,0,7);c.fill();
 c.strokeStyle='#172e42';c.lineWidth=3;
 const plate=(x,y,w,h,color)=>{c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,5);c.fill();c.stroke();};
 plate(-26,-30,18,30,'#647b8e');plate(8,-30,18,30,'#647b8e');
 plate(-34,-80,68,54,'#c68c3e');plate(-27,-75,54,39,'#edbe67');
 plate(-24,-115,48,32,'#91a9b9');plate(-18,-105,36,12,'#13364b');
 c.fillStyle='#83eaff';c.fillRect(-13,-102,10,5);c.fillRect(3,-102,10,5);
 plate(-47,-75,13,40,'#a4b9c6');
 c.save();c.translate(40,-70);c.rotate(Math.sin(t*1.7)*.14-.2);plate(-6,-5,14,33,'#a4b9c6');
 c.strokeStyle='#7ba6b6';c.lineWidth=6;c.beginPath();c.moveTo(0,20);c.lineTo(0,-23);c.stroke();plate(-18,-34,36,16,'#d7e6ed');c.restore();
 c.strokeStyle='#fff0bb';c.lineWidth=3;c.beginPath();c.moveTo(-12,-61);c.lineTo(12,-43);c.moveTo(12,-61);c.lineTo(-12,-43);c.stroke();
 c.fillStyle='#102432ee';c.beginPath();c.roundRect(-57,-145,114,22,7);c.fill();c.fillStyle='#ffe2a1';c.font='bold 12px GameThai, sans-serif';c.textAlign='center';c.fillText('FORGE-09 · อัปเกรด',0,-130);c.restore();
}
