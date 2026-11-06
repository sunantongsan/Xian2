import {t,ui} from './i18n.js';
// Slow idle cycles and short calls; never put permanent instructions over the map.
export function npcLife(time,kind='merchant',near=false){
 const phase=(time+(kind==='buff'?0:5))%12;
 return {wave:phase<3?Math.sin(phase*Math.PI)*.7:Math.sin(time*.9)*.04,
  lean:Math.sin(time*.9)*.018,
  speak:near&&phase<3.8,
  message:kind==='buff'?t('รับบัฟฟรีที่นี่! แตะที่ตัวฉันได้เลย'):t('อาวุธ ยา และอัญมณี พร้อมขายครับ!')};
}
export function drawNpcCall(g,x,y,text,k=1){
 g.save();g.font=`${Math.max(9,Math.min(11,10*k))}px GameThai,sans-serif`;g.textAlign='center';
 const w=Math.min(220,g.measureText(text).width+16),h=25;
 g.fillStyle='#102a39ef';g.strokeStyle='#a7e9e3';g.lineWidth=1;g.beginPath();g.roundRect(x-w/2,y-h,w,h,7);g.fill();g.stroke();
 g.beginPath();g.moveTo(x-4,y);g.lineTo(x,y+5);g.lineTo(x+4,y);g.fill();g.fillStyle='#e0fff4';g.fillText(text,x,y-8,w-10);g.restore();
}
