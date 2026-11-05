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
export function drawLevelAura(g,x,y,k,progress,low=false){
 const t=Math.max(0,Math.min(1,progress));g.save();g.translate(x,y);g.scale(k,k);g.globalCompositeOperation='lighter';
 const glow=g.createRadialGradient(0,-35,0,0,-35,125);glow.addColorStop(0,'#fff2a34d');glow.addColorStop(1,'#42eaff00');g.fillStyle=glow;g.fillRect(-125,-160,250,220);
 for(let j=0;j<3;j++){g.strokeStyle=j===1?'#66ecff':'#ffe4a1';g.lineWidth=3-j*.6;g.globalAlpha=(1-t)*.9;g.beginPath();g.ellipse(0,-j*22*t,35+t*(70+j*20),10+t*24,0,0,Math.PI*2);g.stroke();}
 const count=low?10:24;for(let i=0;i<count;i++){const a=i*2.399+t*2,r=25+t*(45+i%4*12);const px=Math.cos(a)*r,py=-t*(100+i%5*18)+Math.sin(a)*r*.24;g.globalAlpha=Math.sin(Math.PI*t)*.95;g.fillStyle=i%2?'#a9f6ff':'#fff0b2';g.beginPath();g.moveTo(px,py-5);g.lineTo(px+2,py);g.lineTo(px,py+5);g.lineTo(px-2,py);g.closePath();g.fill();}g.restore();
}
