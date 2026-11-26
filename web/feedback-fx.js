// Reward pop-ups, purchase confirmation and coin in/out effects (7.6.1).
import {t} from './i18n.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.abs(Math.round(n)).toLocaleString();
const queue=[];let open=false;
// A separate <dialog> on top of everything; it never pauses or replaces the game window.
export function rewardPopup({icon='🎁',title,detail='',sound}={}){queue.push({icon,title,detail,sound});next();}
function next(){
 if(open||!queue.length||document.hidden)return;open=true;const r=queue.shift(),d=document.createElement('dialog');d.className='reward-popup';
 d.innerHTML=`<div class="reward-rays" aria-hidden="true"></div><div class="reward-icon">${r.icon}</div><span>${t('ได้รับรางวัล')}</span><h2>${esc(r.title)}</h2><p>${esc(r.detail)}</p><button>${t('รับทราบ')}</button>`;
 document.body?.append?.(d);try{d.showModal();}catch{d.setAttribute?.('open','');}r.sound?.();
 let done=false;const finish=()=>{if(done)return;done=true;try{d.close();}catch{}d.remove?.();open=false;next();};
 d.querySelector('button').onclick=finish;d.addEventListener?.('cancel',e=>{e.preventDefault();finish();});setTimeout(finish,6000);
}
document.addEventListener('visibilitychange',next);
// Resolves true only when the player presses confirm.
export function confirmPurchase({name,price,currency='COCKRO',balance,sound}={}){
 return new Promise(resolve=>{
  const d=document.createElement('dialog');d.className='purchase-confirm';const after=Number.isFinite(balance)?balance-price:null;
  d.innerHTML=`<h3>${t('ยืนยันการซื้อ')}</h3><p class="purchase-name">${esc(name)}</p><p class="purchase-price"><img src="items/cockro-coin.webp" alt=""> ${fmt(price)} ${esc(currency)}</p>${after!==null?`<p class="purchase-after">${t('คงเหลือหลังซื้อ')} ${fmt(Math.max(0,after))}</p>`:''}<div><button data-ok>${t('ยืนยันซื้อ')}</button><button data-no>${t('ยกเลิก')}</button></div>`;
  document.body?.append?.(d);try{d.showModal();}catch{d.setAttribute?.('open','');}sound?.();
  const end=v=>{try{d.close();}catch{}d.remove?.();resolve(v);};
  d.querySelector('[data-ok]').onclick=()=>end(true);d.querySelector('[data-no]').onclick=()=>end(false);d.addEventListener?.('cancel',e=>{e.preventDefault();end(false);});
 });
}
// Floating "+/- coins" near the wallet with a few coins flying in or out.
let lastSound=0;
export function coinFlyout(delta,{anchor,sound}={}){
 if(!delta||!Number.isFinite(delta)||document.hidden)return;
 const box=anchor?.getBoundingClientRect?.()??{left:20,top:20,width:160,height:30},gain=delta>0,el=document.createElement('div');
 el.className='coin-flyout '+(gain?'gain':'spend');el.style.left=(box.left+box.width/2)+'px';el.style.top=(box.top+box.height/2)+'px';
 el.innerHTML=`<b>${gain?'+':'−'}${fmt(delta)}</b>`+Array.from({length:gain?5:4},(_,i)=>`<img src="items/cockro-coin.webp" alt="" style="--dx:${(i-2)*18}px;--d:${i*.06}s">`).join('');
 document.body?.append?.(el);setTimeout(()=>el.remove?.(),1400);
 const now=Date.now();if(sound&&now-lastSound>700){lastSound=now;sound(gain);}
}
