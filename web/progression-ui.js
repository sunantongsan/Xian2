import {pendingMutation} from './mutation.js';
export function createProgressionUI(onVisit){
 const notice=document.createElement('button');notice.id='mutationNotice';notice.hidden=true;notice.onclick=onVisit;notice.innerHTML='<span class="mutation-sigil">✧</span><span><b>พร้อมกลายพันธุ์</b><small>พบ ดร.ไอสไตร์ • หยุดรับ EXP</small></span><span>›</span>';(document.getElementById('fieldActions')||document.body).appendChild(notice);
 const overlay=document.createElement('div');overlay.id='levelCelebration';overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');overlay.hidden=true;overlay.innerHTML='<span class="level-kicker" hidden>LEVEL UP</span><strong></strong><small hidden></small>';document.body.appendChild(overlay);let timer;
 return {
  celebrate(level,{mutation=false,name='',pending=false}={}){
   clearTimeout(timer);overlay.hidden=false;overlay.classList.remove('playing');void overlay.offsetWidth;overlay.classList.add('playing');
   overlay.querySelector('.level-kicker').textContent=mutation?'MUTATION COMPLETE':'LEVEL UP';
   overlay.querySelector('strong').textContent=mutation?'กลายพันธุ์สำเร็จ':`ยินดีด้วยคุณเข้าสู่เลเวล ${level}`;
   overlay.querySelector('small').textContent=mutation?`${name} • คืนแต้มค่าสถานะให้จัดสรรใหม่แล้ว`:pending?'ถึงเวลากลายพันธุ์ • กลับยานพบ ดร.ไอสไตร์':'พลังของคุณเติบโตขึ้นแล้ว';
   timer=setTimeout(()=>{overlay.hidden=true;},2400);
  },
  update(s){const pending=!!pendingMutation(s);notice.hidden=!pending;for(const id of ['characterShortcut','statsShortcut'])document.getElementById(id)?.classList.toggle('mutation-ready',pending);},
  hide(){notice.hidden=true;overlay.hidden=true;clearTimeout(timer);}
 };
}
// Bounded canvas geometry: no full-screen flash, blur or per-frame particles.
export function drawLevelAura(g,x,y,k,progress,low=false){
 const t=Math.max(0,Math.min(1,progress));if(t<=0||t>=1)return;
 const fade=Math.min(1,t/.08)*Math.min(1,(1-t)/.28),rise=1-Math.pow(1-Math.min(1,t/.4),3);
 g.save();g.translate(x,y);g.scale(k,k);g.globalCompositeOperation='lighter';g.globalAlpha=fade;
 const glow=g.createRadialGradient(0,-45,4,0,-45,115);glow.addColorStop(0,'#fff1ba55');glow.addColorStop(.45,'#ffc65d22');glow.addColorStop(1,'#58eaff00');g.fillStyle=glow;g.fillRect(-115,-160,230,230);
 // Narrow columns leave the hero silhouette readable.
 const beam=g.createLinearGradient(0,-245*rise,0,5);beam.addColorStop(0,'#8cffff00');beam.addColorStop(.55,'#72eaff22');beam.addColorStop(1,'#fff0bbaa');g.fillStyle=beam;
 for(const side of [-1,1]){g.beginPath();g.moveTo(side*19,-245*rise);g.lineTo(side*29,-245*rise);g.lineTo(side*55,0);g.lineTo(side*35,0);g.closePath();g.fill();}
 for(let j=0;j<3;j++){const r=43+j*14+rise*14;g.strokeStyle=j===1?'#71edff':'#ffe4a0';g.lineWidth=j===0?2.8:1.4;g.beginPath();g.ellipse(0,-3,r,r*.29,0,0,Math.PI*2);g.stroke();}
 // Orbiting rune ticks and a rising helix.
 for(let i=0;i<(low?8:16);i++){const a=i*Math.PI*2/(low?8:16)+t*1.8;g.strokeStyle=i%2?'#8af5ff':'#fff2bd';g.lineWidth=2;g.beginPath();g.moveTo(Math.cos(a)*67,Math.sin(a)*19-3);g.lineTo(Math.cos(a)*74,Math.sin(a)*22-3);g.stroke();}
 if(!low){g.strokeStyle='#8bf5ff88';g.lineWidth=1.5;g.beginPath();for(let i=0;i<=48;i++){const u=i/48,a=u*Math.PI*4-t*7,px=Math.cos(a)*43,py=-u*170*rise+Math.sin(a)*12;i?g.lineTo(px,py):g.moveTo(px,py);}g.stroke();}
 const count=low?12:30;for(let i=0;i<count;i++){const u=(t*1.25+i/count)%1,a=i*2.399+t*2,r=28+(i%5)*9,px=Math.cos(a)*r,py=-u*195+Math.sin(a)*r*.24,size=2+(i%3);g.globalAlpha=fade*Math.sin(Math.PI*u);g.fillStyle=i%3?'#fff1b6':'#91f7ff';g.beginPath();g.moveTo(px,py-size*2);g.lineTo(px+size*.65,py);g.lineTo(px,py+size*2);g.lineTo(px-size*.65,py);g.closePath();g.fill();}
 // One soft expanding pulse, without flashing the whole screen.
 const pulse=Math.min(1,t/.38);g.globalAlpha=fade*(1-pulse)*.8;g.strokeStyle='#fff4ca';g.lineWidth=3;g.beginPath();g.ellipse(0,-3,35+pulse*90,10+pulse*28,0,0,Math.PI*2);g.stroke();g.restore();
}
