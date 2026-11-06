import {t} from './i18n.js';
const pending=[];let active=false;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function celebrateCoins(receipt,{sound,acknowledge}={}){
 pending.push({receipt,sound,acknowledge});present();
}
function present(){
 if(active||!pending.length||document.hidden)return;active=true;
 const {receipt,sound,acknowledge}=pending.shift(),dialog=document.createElement('dialog');dialog.className='coin-celebration';
 dialog.innerHTML=`<div class="coin-burst" aria-hidden="true"><div class="coin-halo"></div><img class="coin-prize" src="items/cockro-coin.webp" alt="">${Array.from({length:12},(_,i)=>`<img class="coin-flight" src="items/cockro-coin.webp" alt="" style="--x:${Math.cos(i*Math.PI/6)*160}px;--y:${Math.sin(i*Math.PI/6)*90}px;--delay:${i*.055}s">`).join('')}</div><div class="coin-received"><span>COCKRO • REWARDS</span><h2>${t('ยินดีด้วย!')}</h2><strong>+${Number(receipt.gold).toLocaleString()} <small>COCKRO coin</small></strong><p>${t('เติมเข้ากระเป๋าแล้ว')}</p><b>${escape(receipt.characterName)}</b><button>${t('ยอดเยี่ยม!')}</button></div>`;
 document.body.append(dialog);dialog.showModal();sound?.();
 let finished=false;const finish=()=>{if(finished)return;finished=true;acknowledge?.();dialog.close();dialog.remove();active=false;present();};
 dialog.querySelector('button').onclick=finish;dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});
}
addEventListener('visibilitychange',()=>{if(!document.hidden)present();});
