// Shared by the authoritative server and offline training.
export const ENHANCE_SLOTS=['weapon','ring','amulet'];
export const MAX_PLUS=9;
export const SPECIALS=[
 {id:'hp25',name:'ฟื้น HP 25% ทุก 2 วินาที',stat:'hpRegen',value:.25,weight:5},
 {id:'mp10',name:'ฟื้น MP 10% ทุก 2 วินาที',stat:'mpRegen',value:.1,weight:20},
 {id:'crit5',name:'โอกาสคริติคอล +5%',stat:'crit',value:.05,weight:20},
 {id:'atk30',name:'โจมตี +30',stat:'atk',value:30,weight:25},
 {id:'def20',name:'ป้องกัน +20',stat:'def',value:20,weight:20},
 {id:'hp300',name:'HP สูงสุด +300',stat:'hp',value:300,weight:10}
];
export const specialInfo=id=>SPECIALS.find(x=>x.id===id);
export const auraLevel=s=>Math.max(0,...ENHANCE_SLOTS.map(k=>Math.min(9,s.equip?.[k]?.plus||0)));
export function rerollSpecial(s,slot,rng=Math.random){
 const it=s.equip?.[slot];if(!ENHANCE_SLOTS.includes(slot)||!it||!(s.upgradeItems?.meteor>=1))return false;
 let n=Math.min(.999999,Math.max(0,rng()))*100,choice=SPECIALS.at(-1);
 for(const row of SPECIALS){n-=row.weight;if(n<0){choice=row;break;}}
 s.upgradeItems.meteor--;it.previousSpecial=it.special||null;it.special=choice.id;it.rollRevision=(it.rollRevision||0)+1;it.restoreAvailable=true;return true;
}
export function restoreTarget(s,slot){const it=s.equip?.[slot];return ENHANCE_SLOTS.includes(slot)&&it?.restoreAvailable?{itemId:it.id,revision:it.rollRevision}:null;}
export function restoreSpecial(s,target){
 const it=[...Object.values(s.equip||{}),...(s.bag||[])].find(x=>x?.id===target?.itemId);
 if(!it?.restoreAvailable||it.rollRevision!==target.revision)return false;
 it.special=it.previousSpecial||null;it.previousSpecial=null;it.restoreAvailable=false;return true;
}
export function specialFields(it){return {special:specialInfo(it.special)?.id||null,previousSpecial:specialInfo(it.previousSpecial)?.id||null,rollRevision:Number.isSafeInteger(it.rollRevision)&&it.rollRevision>=0?it.rollRevision:0,restoreAvailable:it.restoreAvailable===true};}
export function applyRegen(p,dt,maxHP,maxMP){
 if(p.hp<=0){p.regenClock=0;return;}p.regenClock=(p.regenClock||0)+Math.max(0,dt);
 if(p.regenClock<2)return;const ticks=Math.floor(p.regenClock/2);p.regenClock%=2;
 let hp=0,mp=0;for(const slot of ENHANCE_SLOTS){const opt=specialInfo(p.s.equip?.[slot]?.special);if(opt?.stat==='hpRegen')hp+=opt.value;if(opt?.stat==='mpRegen')mp+=opt.value;}
 p.hp=Math.min(maxHP,p.hp+maxHP*hp*ticks);p.mp=Math.min(maxMP,(p.mp||0)+maxMP*mp*ticks);
}
export const TEST_GRANT_ID='pioneer-50000-v1';
export function grantTestGold(s,enabled){if(!enabled||s.testGoldGrant===TEST_GRANT_ID)return false;s.stones+=50000;s.testGoldGrant=TEST_GRANT_ID;return true;}
export function exchangeGold(s,amount){if(!Number.isSafeInteger(amount)||amount<1||amount>1000||s.stones<amount||s.gold+amount*10000>1e10)return false;s.stones-=amount;s.gold+=amount*10000;return true;}

