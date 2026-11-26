import {t,ui} from './i18n.js';
import {DAILY_GOLD,CHECKIN_AD_MULTIPLIER,checkinStatus} from './checkin.js';
export function giftShell(tab,content){return ui`<section class="gift-center"><header class="gift-heading"><img src="items/reward-gift.webp" alt=""><div><small>COCKRO • REWARDS</small><h2>ของขวัญและเหรียญ</h2></div></header><nav class="gift-tabs" aria-label="ของขวัญและร้านเหรียญ"><button id="giftDailyTab" aria-current="${tab==='daily'?'page':'false'}">เช็กอินฟรี</button><button id="giftCoinsTab" aria-current="${tab==='coins'?'page':'false'}">แพ็กเกจ COCKRO</button></nav><div class="gift-content">${content}</div></section>`;}
const weeklyBase=DAILY_GOLD.reduce((sum,amount)=>sum+amount,0);
const coins=amount=>amount.toLocaleString('en-US');
export function checkinPanelHTML(s,now=Date.now(),pending=false){
 const status=checkinStatus(s,now),disabled=status.claimed||pending?'disabled':'';
 const days=DAILY_GOLD.map((amount,i)=>{
  const done=i+1<status.day||i+1===status.day&&status.claimed;
  return ui`<article class="gift-day ${i+1===status.day?'today':''} ${done?'claimed':''}"><small>วันที่ ${i+1}</small><img src="items/cockro-coin.webp" alt=""><b>${coins(amount)}</b><span>${done?t('✓ รับแล้ว'):i===6?t('โบนัส'):'COCKRO'}</span></article>`;
 }).join('');
 return ui`<section class="free-checkin"><div class="gift-summary"><div><small>รางวัลประจำวันที่ ${status.day}</small><h3>${coins(status.reward)} <span>COCKRO</span></h3><p>${t('เลือกรับฟรี หรือดูโฆษณาจนจบเพื่อรับ 3 เท่า')}</p></div><img src="items/reward-gift.webp" alt="กล่องของขวัญประจำวัน"></div>
 <div class="gift-days">${days}</div><div class="gift-choices">
 <button id="claimDailyGift" class="gift-claim" ${disabled}>${status.claimed?t('✓ รับรางวัลวันนี้แล้ว'):t('รับฟรี')}<small>${coins(status.reward)} COCKRO</small></button>
 <button id="claimTripleGift" class="gift-claim" data-reward-item="dailyCheckinTriple" ${disabled}>${t('รับ x3')}<small>${coins(status.reward*CHECKIN_AD_MULTIPLIER)} COCKRO</small></button></div>
 <p id="checkinMessage" role="status" aria-live="polite">${status.claimed?t('กลับมารับใหม่ได้หลังเที่ยงคืนเวลาไทย'):t('รางวัลพื้นฐานรวม 7 วัน')+' · '+coins(weeklyBase)+' COCKRO'}</p>
 <p class="gift-balance">มี ${coins(s.stones)} COCKRO • ขาดวันเริ่มนับใหม่</p><button id="giftTasks" class="gift-tasks">ภารกิจประจำวัน ›</button></section>`;
}
