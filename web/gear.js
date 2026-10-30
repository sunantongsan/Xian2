import {countActivity} from './daily-activities.js';
import {ENHANCE_SLOTS,MAX_PLUS,specialInfo,specialFields} from './enhancement.js';
import {UPGRADE_ITEMS,GEM_IDS,normalizeGems,normalizeUpgradeItems} from './upgrade-items.js';
// Equipment: eight slots, six tiers by level, four rarities (MU-style colours), drops, bag, equip and sell.
// Pure rules (no DOM) so saves, combat and the paper-doll UI share one definition.
export const SLOTS={
 weapon:{name:'อาวุธ',atk:9},helm:{name:'หมวกเกราะ',def:1.2,hp:22},armor:{name:'เกราะอก',def:2.2,hp:40},gloves:{name:'ถุงมือ',def:.8,atk:3},
 boots:{name:'รองเท้า',def:.8,speed:3},wings:{name:'ปีกพลังงาน',atk:4,def:1.2,hp:20},ring:{name:'แหวน',crit:.012},amulet:{name:'สร้อยพลัง',mp:14,spell:.03}
};
export const SLOT_ORDER=['helm','armor','gloves','boots','weapon','wings','ring','amulet'];
export const TIERS=[
 {name:'ฝึกหัด',level:1},{name:'เหล็กดาว',level:10},{name:'ไคตินอำพัน',level:20},
 {name:'คริสตัลไซเบอร์',level:30},{name:'นีออนโคร',level:40},{name:'แกนดาวเพลิง',level:50}
];
export const RARITY=[
 {name:'ธรรมดา',color:'#e9e4d6',mult:1},{name:'ดีเยี่ยม',color:'#5aa8ff',mult:1.25},
 {name:'หายาก',color:'#4ff08a',mult:1.6},{name:'ตำนาน',color:'#ffb440',mult:2.1}
];
export const BAG_SIZE=40;
const NOUN={weapon:{'sword-cockro':'ดาบพลาสมา','demon-scorpion':'มีดคู่นาโนชีวพิษ','sword-dragonfly':'ธนูเรลกัน','sword-cricket':'ค้อนโซนิก'}};
export function itemName(it,hero){const noun=it.slot==='weapon'?(NOUN.weapon[hero]||'อาวุธฮีโร่'):SLOTS[it.slot].name;return `${noun}${TIERS[it.tier].name}`+(it.plus?` +${it.plus}`:'');}
export const tierForLevel=level=>TIERS.reduce((t,x,i)=>level>=x.level?i:t,0);
export function itemStats(it){
 const base=SLOTS[it.slot],k=(1+it.tier*1.15)*RARITY[it.rarity].mult*(1+Math.max(it.plus||0,it.legacyPlus||0)*.08),o={};
 for(const key of ['atk','def','hp','crit','speed','mp','spell'])if(base[key])o[key]=+(base[key]*k).toFixed(key==='crit'||key==='spell'?3:1);
 for(const id of GEM_IDS){const n=normalizeGems(it.gems)[id],g=UPGRADE_ITEMS[id];if(n)o[g.stat]=+((o[g.stat]||0)+n*g.amount).toFixed(g.stat==='crit'?3:1);}
 const opt=specialInfo(it.special);if(opt&&!['hpRegen','mpRegen'].includes(opt.stat))o[opt.stat]=(o[opt.stat]||0)+opt.value;
 return o;
}
export function itemPower(it){const st=itemStats(it);return Math.round((st.atk||0)*4+(st.def||0)*6+(st.hp||0)*.5+(st.crit||0)*900+(st.speed||0)*3+(st.mp||0)*.4+(st.spell||0)*500);}
export function sellPrice(it){return Math.round(40*(1+it.tier)**2*RARITY[it.rarity].mult);}
export function gearTotals(s){
 const t={atk:0,def:0,hp:0,crit:0,speed:0,mp:0,spell:0};
 for(const it of Object.values(s.equip||{}))if(it)for(const [k,v]of Object.entries(itemStats(it)))t[k]+=v;
 return t;
}
let uid=0;
export function makeItem(slot,tier,rarity,rng=Math.random){return {id:Date.now().toString(36)+(uid++).toString(36)+Math.floor(rng()*1e4).toString(36),slot,tier,rarity,plus:0,...specialFields({})};}
// Drop on kill: regular 1%, elite 15%, boss always (and at least rare).
export function rollDrop(m,rng=Math.random){
 const chance=m.boss?1:m.elite?.15:.01;if(rng()>=chance)return null;
 const slot=SLOT_ORDER[Math.floor(rng()*SLOT_ORDER.length)],tier=tierForLevel(m.level);
 const r=rng();let rarity=r<.04?3:r<.16?2:r<.45?1:0;if(m.boss)rarity=Math.max(2,rarity);else if(m.elite)rarity=Math.max(1,rarity);
 return makeItem(slot,tier,rarity,rng);
}
export function addToBag(s,it){if(s.bag.length>=BAG_SIZE){s.gold+=sellPrice(it);return false;}s.bag.push(it);return true;}
export function canEquip(s,it){return s.level>=TIERS[it.tier].level;}
export function equip(s,id){const i=s.bag.findIndex(x=>x.id===id);if(i<0)return 'ไม่พบไอเท็ม';const it=s.bag[i];if(!canEquip(s,it))return `ต้องเลเวล ${TIERS[it.tier].level}`;s.bag.splice(i,1);const old=s.equip[it.slot];if(old)s.bag.push(old);s.equip[it.slot]=it;return null;}
export function unequip(s,slot){const it=s.equip[slot];if(!it)return 'ช่องว่าง';if(s.bag.length>=BAG_SIZE)return 'กระเป๋าเต็ม';s.bag.push(it);s.equip[slot]=null;return null;}
export function sell(s,id){const i=s.bag.findIndex(x=>x.id===id);if(i<0)return 0;const [it]=s.bag.splice(i,1),g=sellPrice(it);s.gold+=g;return g;}
export function freshGear(s){s.equip=Object.fromEntries(SLOT_ORDER.map(k=>[k,null]));s.equip.weapon=makeItem('weapon',0,0);s.equip.armor=makeItem('armor',0,0);s.bag=[makeItem('helm',0,1),makeItem('boots',0,0),makeItem('wings',0,1)];return s;}
const validItem=it=>it&&typeof it.id==='string'&&SLOTS[it.slot]&&Number.isInteger(it.tier)&&it.tier>=0&&it.tier<TIERS.length&&Number.isInteger(it.rarity)&&it.rarity>=0&&it.rarity<RARITY.length;
export function normalizeGear(s,v={}){
 if(!v.equip&&!v.bag)return freshGear(s);
 s.equip=Object.fromEntries(SLOT_ORDER.map(k=>{const it=v.equip?.[k];return [k,validItem(it)&&it.slot===k?{id:it.id.slice(0,40),slot:k,tier:it.tier,rarity:it.rarity,plus:Math.max(0,Math.min(ENHANCE_SLOTS.includes(it.slot)?9:15,Math.floor(it.plus||0))),...specialFields(it),...(it.legacyPlus?{legacyPlus:Math.min(15,it.legacyPlus)}:{}),...(it.gems?{gems:normalizeGems(it.gems)}:{})}:null];}));
 s.bag=(Array.isArray(v.bag)?v.bag:[]).filter(validItem).slice(0,BAG_SIZE).map(it=>({id:it.id.slice(0,40),slot:it.slot,tier:it.tier,rarity:it.rarity,plus:Math.max(0,Math.min(ENHANCE_SLOTS.includes(it.slot)?9:15,Math.floor(it.plus||0))),...specialFields(it),...(it.legacyPlus?{legacyPlus:Math.min(15,it.legacyPlus)}:{}),...(it.gems?{gems:normalizeGems(it.gems)}:{})}));
 return s;
}
export function heroPower(s,base){return Math.round(base+Object.values(s.equip||{}).reduce((a,it)=>a+(it?itemPower(it):0),0));}


// Save keys remain compatible: gold = spending money G, stones = rare upgrade gold.
export const gearUpgradeCost=it=>20*((it.plus||0)+1)+it.tier*5;
export const gearUpgradeG=it=>500*((it.plus||0)+1)**2;
export function upgradeGear(s,slot){
 const it=s.equip?.[slot];if(!ENHANCE_SLOTS.includes(slot)||!it||(it.plus||0)>=MAX_PLUS)return false;
 normalizeUpgradeItems(s);const cost=gearUpgradeCost(it),g=gearUpgradeG(it),n=(it.plus||0)+1;
 if(!Number.isFinite(s.stones)||s.stones<cost||s.gold<g||s.upgradeItems.alloy<n)return false;
 s.stones-=cost;s.gold-=g;s.upgradeItems.alloy-=n;it.plus=n;countActivity(s,'upgrade');return true;
}
export function gearShopPrice(slot,tier){return 150+100*tier+(slot==='weapon'?100:0);}
export function buyShopGear(s,slot){if(!ENHANCE_SLOTS.includes(slot)||s.bag.length>=BAG_SIZE)return false;const tier=tierForLevel(s.level),cost=gearShopPrice(slot,tier);if(s.stones<cost)return false;s.stones-=cost;s.bag.push(makeItem(slot,tier,2));return true;}
