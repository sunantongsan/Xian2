import {t,ui} from './i18n.js';
// Shared by the authoritative server and offline training.
export const ENHANCE_SLOTS=['weapon','ring','amulet'];
export const MAX_PLUS=12;
export const SPECIALS=[
 {id:'hp25',get name(){return t('ฟื้น HP 2% ทุก 2 วินาที (รวมสูงสุด 4%)');},stat:'hpRegen',value:.02,weight:5},
 {id:'mp10',get name(){return t('ฟื้น MP 10% ทุก 2 วินาที');},stat:'mpRegen',value:.1,weight:20},
 {id:'crit5',get name(){return t('โอกาสคริติคอล +5%');},stat:'crit',value:.05,weight:20},
 {id:'atk30',get name(){return t('โจมตี +30');},stat:'atk',value:30,weight:25},
 {id:'def20',get name(){return t('ป้องกัน +20');},stat:'def',value:20,weight:20},
 {id:'hp300',get name(){return t('HP สูงสุด +300');},stat:'hp',value:300,weight:10}
];
export const specialInfo=id=>SPECIALS.find(x=>x.id===id);
export const auraLevel=s=>Math.max(0,...ENHANCE_SLOTS.map(k=>Math.min(12,s.equip?.[k]?.plus||0)));
export function rerollSpecial(){return false;}
export function restoreTarget(){return null;}
export function restoreSpecial(s,target){
 const it=[...Object.values(s.equip||{}),...(s.bag||[])].find(x=>x?.id===target?.itemId);
 if(!it?.restoreAvailable||it.rollRevision!==target.revision)return false;
 it.special=it.previousSpecial||null;it.previousSpecial=null;it.restoreAvailable=false;return true;
}
export function specialFields(it){return {upgradeFails:Number.isSafeInteger(it.upgradeFails)?Math.max(0,Math.min(100,it.upgradeFails)):0,special:specialInfo(it.special)?.id||null,previousSpecial:specialInfo(it.previousSpecial)?.id||null,rollRevision:Number.isSafeInteger(it.rollRevision)&&it.rollRevision>=0?it.rollRevision:0,restoreAvailable:it.restoreAvailable===true};}
export function applyRegen(p,dt,maxHP,maxMP){
 if(p.hp<=0){p.regenClock=0;return;}p.regenClock=(p.regenClock||0)+Math.max(0,dt);
 if(p.regenClock<2)return;const ticks=Math.floor(p.regenClock/2);p.regenClock%=2;
 let hp=0,mp=0;for(const slot of ENHANCE_SLOTS){const opt=specialInfo(p.s.equip?.[slot]?.special);if(opt?.stat==='hpRegen')hp+=opt.value;if(opt?.stat==='mpRegen')mp+=opt.value;}
 p.hp=Math.min(maxHP,p.hp+maxHP*Math.min(.04,hp)*ticks);p.mp=Math.min(maxMP,(p.mp||0)+maxMP*mp*ticks);
}
export function exchangeGold(){return false;}




