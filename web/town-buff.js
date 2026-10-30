// Server owns eligibility and expiry; percentages add to unbuffed stats.
export const BUFF_DURATION=3600000;
export const BUFF_NPC_UV=[.57,.59];
export function buffActive(s,now=Date.now()){return Number.isFinite(s.townBuffUntil)&&s.townBuffUntil>now;}
export function buffMultiplier(s,now=Date.now()){return buffActive(s,now)?3:1;}
export function movementMultiplier(s,now=Date.now()){return buffActive(s,now)?2:1;}
export function normalizeTownBuff(s,v,now=Date.now()){
 s.townBuffUntil=Number.isFinite(v.townBuffUntil)?Math.max(0,Math.min(v.townBuffUntil,now+BUFF_DURATION)):0;
}
export function grantTownBuff(p,enabled,near,now=Date.now()){
 if(!enabled||!near||p.hp<=0||now<(p.buffRequestAt||0)+2000)return false;
 p.buffRequestAt=now;p.s.townBuffUntil=now+BUFF_DURATION;p.dirty=true;return true;
}
export function drawBuffAura(c,x,y,k,t,burst=false){
 c.save();c.globalCompositeOperation='lighter';const pulse=1+Math.sin(t*3)*.07;
 c.strokeStyle='#65e7ff';c.lineWidth=2*k;c.shadowColor='#37cfff';c.shadowBlur=10*k;
 for(let i=0;i<2;i++){c.beginPath();c.ellipse(x,y-3*k,(32+i*9)*k*pulse,(11+i*4)*k*pulse,0,0,Math.PI*2);c.stroke();}
 for(let i=0;i<(burst?18:6);i++){const a=i*2.399+t*.9,h=((t*.35+i*.17)%1)*95*k;c.fillStyle=i%2?'#ffe6a1':'#8ef4ff';c.beginPath();c.arc(x+Math.cos(a)*30*k,y-h,Math.max(1,2*k),0,7);c.fill();}
 if(burst){const g=c.createLinearGradient(x,y-140*k,x,y);g.addColorStop(0,'#75eeff00');g.addColorStop(.7,'#75eeff44');g.addColorStop(1,'#fff0c480');c.fillStyle=g;c.fillRect(x-32*k,y-140*k,64*k,140*k);}
 c.restore();
}
export function drawBuffRobot(c,x,y,k,t){
 c.save();c.translate(x,y);c.scale(k,k);c.fillStyle='#071a29aa';c.beginPath();c.ellipse(0,0,28,9,0,0,7);c.fill();c.translate(0,-6-Math.sin(t*2)*3);
 const metal=c.createLinearGradient(-22,0,22,0);metal.addColorStop(0,'#426379');metal.addColorStop(.45,'#e2eff8');metal.addColorStop(1,'#5a7b92');
 c.fillStyle=metal;c.strokeStyle='#203b56';c.lineWidth=2;
 for(const [a,b,w,h] of [[-17,-69,34,24],[-21,-42,42,32],[-30,-40,8,29],[22,-40,8,29],[-17,-9,12,13],[5,-9,12,13]]){c.beginPath();c.roundRect(a,b,w,h,5);c.fill();c.stroke();}
 c.fillStyle='#0a2540';c.fillRect(-12,-62,24,9);c.fillStyle='#6cffff';c.shadowColor='#3cdfff';c.shadowBlur=10;c.fillRect(-9,-60,6,4);c.fillRect(3,-60,6,4);c.beginPath();c.arc(0,-27,7,0,7);c.fill();c.strokeStyle='#ffe69c';c.beginPath();c.arc(0,-27,11,t,t+4.8);c.stroke();c.restore();
}
