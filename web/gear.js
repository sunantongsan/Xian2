import {INSECT_ARMOR,insectFields} from './insect-armor.js';
import {t,ui,language} from './i18n.js';
import {countActivity} from './daily-activities.js';
import {ENHANCE_SLOTS,MAX_PLUS,specialInfo,specialFields} from './enhancement.js';
import {UPGRADE_ITEMS,GEM_IDS,normalizeGems,normalizeUpgradeItems} from './upgrade-items.js';
// Equipment: eight slots, six tiers by level, four rarities (MU-style colours), drops, bag, equip and sell.
// Pure rules (no DOM) so saves, combat and the paper-doll UI share one definition.
export const SLOTS={
 weapon:{get name(){return t('อาวุธ');},atk:9},helm:{get name(){return t('หมวกเกราะ');},def:1.2,hp:22},armor:{get name(){return t('เกราะอก');},def:2.2,hp:40},gloves:{get name(){return t('ถุงมือ');},def:.8,atk:3},
 boots:{get name(){return t('รองเท้า');},def:.8,speed:3},wings:{get name(){return t('ปีกพลังงาน');},atk:4,def:1.2,hp:20},ring:{get name(){return t('แหวน');},crit:.012},amulet:{get name(){return t('สร้อยพลัง');},mp:14,spell:.03}
};
export const SLOT_ORDER=['helm','armor','gloves','boots','weapon','wings','ring','amulet'];
export const TIERS=[
 {get name(){return t('ฝึกหัด');},level:1},{get name(){return t('เหล็กดาว');},level:10},{get name(){return t('ไคตินอำพัน');},level:20},
 {get name(){return t('คริสตัลไซเบอร์');},level:30},{get name(){return t('นีออนโคร');},level:40},{get name(){return t('แกนดาวเพลิง');},level:50},
 ...Array.from({length:16},(_,i)=>({get name(){return t('ควอนตัม Mk.')+(i+6);},level:(i+6)*10}))
];
export const RARITY=[
 {get name(){return t('ธรรมดา');},color:'#e9e4d6',mult:1},{get name(){return t('ดีเยี่ยม');},color:'#5aa8ff',mult:1.25},
 {get name(){return t('หายาก');},color:'#4ff08a',mult:1.6},{get name(){return t('ตำนาน');},color:'#ffb440',mult:2.1}
];
export const BAG_SIZE=40;
const NOUN={weapon:{get 'sword-cockro'(){return t('ดาบนักรบ');},get 'demon-scorpion'(){return t('มีดคู่');},get 'sword-dragonfly'(){return t('ธนู');},get 'sword-cricket'(){return t('ค้อน');},get 'sword-mage'(){return t('คทาเวท');},get 'sword-acolyte'(){return t('คทาศักดิ์สิทธิ์');}}};
export function itemName(it,hero){const insect=INSECT_ARMOR[insectFields(it).insect];const noun=insect?(language.current==='en'?insect.en:insect.name):it.slot==='weapon'?(NOUN.weapon[hero]||t('อาวุธฮีโร่')):SLOTS[it.slot].name;return `${noun}${language.current==='en'?' ':''}${TIERS[it.tier].name}`+(it.plus?` +${it.plus}`:'');}
export const tierForLevel=level=>TIERS.reduce((t,x,i)=>level>=x.level?i:t,0);
export function itemStats(it){
 const base=SLOTS[it.slot],k=(1+it.tier*1.15)*RARITY[it.rarity].mult*(1+Math.max(it.plus||0,it.legacyPlus||0)*.08),o={};
 for(const key of ['atk','def','hp','crit','speed','mp','spell'])if(base[key])o[key]=+(base[key]*k).toFixed(key==='crit'||key==='spell'?3:1);
 for(const id of GEM_IDS){const n=normalizeGems(it.gems)[id],g=UPGRADE_ITEMS[id];if(n)o[g.stat]=+((o[g.stat]||0)+n*g.amount).toFixed(g.stat==='crit'?3:1);}
 const opt=specialInfo(it.special);if(opt&&!['hpRegen','mpRegen'].includes(opt.stat))o[opt.stat]=(o[opt.stat]||0)+opt.value;
 for(const [key,value] of Object.entries(INSECT_ARMOR[insectFields(it).insect]?.bonus||{}))o[key]=(o[key]||0)+value*(1+it.tier*.4);
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
export function equip(s,id){const i=s.bag.findIndex(x=>x.id===id);if(i<0)return t('ไม่พบไอเท็ม');const it=s.bag[i];if(!canEquip(s,it))return ui`ต้องเลเวล ${TIERS[it.tier].level}`;s.bag.splice(i,1);const old=s.equip[it.slot];if(old)s.bag.push(old);s.equip[it.slot]=it;return null;}
export function unequip(s,slot){const it=s.equip[slot];if(!it)return t('ช่องว่าง');if(s.bag.length>=BAG_SIZE)return t('กระเป๋าเต็ม');s.bag.push(it);s.equip[slot]=null;return null;}
export function sell(s,id){const i=s.bag.findIndex(x=>x.id===id);if(i<0)return 0;const [it]=s.bag.splice(i,1),g=sellPrice(it);s.gold+=g;return g;}
export function freshGear(s){s.equip=Object.fromEntries(SLOT_ORDER.map(k=>[k,null]));s.equip.weapon=makeItem('weapon',0,0);s.equip.armor=makeItem('armor',0,0);s.bag=[makeItem('helm',0,1),makeItem('boots',0,0),makeItem('wings',0,1)];return s;}
const validItem=it=>it&&typeof it.id==='string'&&SLOTS[it.slot]&&Number.isInteger(it.tier)&&it.tier>=0&&it.tier<TIERS.length&&Number.isInteger(it.rarity)&&it.rarity>=0&&it.rarity<RARITY.length;
export function normalizeGear(s,v={}){
 if(!v.equip&&!v.bag)return freshGear(s);
 s.equip=Object.fromEntries(SLOT_ORDER.map(k=>{const it=v.equip?.[k];return [k,validItem(it)&&it.slot===k?{id:it.id.slice(0,40),slot:k,tier:it.tier,rarity:it.rarity,plus:Math.max(0,Math.min(ENHANCE_SLOTS.includes(it.slot)?9:15,Math.floor(it.plus||0))),...specialFields(it),...insectFields(it),...(it.legacyPlus?{legacyPlus:Math.min(15,it.legacyPlus)}:{}),...(it.gems?{gems:normalizeGems(it.gems)}:{})}:null];}));
 s.bag=(Array.isArray(v.bag)?v.bag:[]).filter(validItem).slice(0,BAG_SIZE).map(it=>({id:it.id.slice(0,40),slot:it.slot,tier:it.tier,rarity:it.rarity,plus:Math.max(0,Math.min(ENHANCE_SLOTS.includes(it.slot)?9:15,Math.floor(it.plus||0))),...specialFields(it),...insectFields(it),...(it.legacyPlus?{legacyPlus:Math.min(15,it.legacyPlus)}:{}),...(it.gems?{gems:normalizeGems(it.gems)}:{})}));
 return s;
}
export function heroPower(s,base){return Math.round(base+Object.values(s.equip||{}).reduce((a,it)=>a+(it?itemPower(it):0),0));}


// Save keys remain compatible: gold = spending money G, stones = rare upgrade gold.
export const gearUpgradeCost=it=>0;
export const gearUpgradeG=it=>500*((it.plus||0)+1)**2;
export const upgradeMaterial=it=>'alloy';
export const upgradeChance=it=>Math.min(1,([1,1,1,.65,.5,.35,.25,.15,.1][it.plus||0]||0)+Math.max(0,it.upgradeFails||0)*.05);
export function upgradeGear(s,slot,rng=Math.random){
 const it=s.equip?.[slot];if(!ENHANCE_SLOTS.includes(slot)||!it||(it.plus||0)>=MAX_PLUS)return false;
 normalizeUpgradeItems(s);const g=gearUpgradeG(it),n=(it.plus||0)+1;
 if(!Number.isFinite(s.gold)||s.gold<g||s.upgradeItems[upgradeMaterial(it)]<1||(n>=4&&s.upgradeItems.protect<1))return false;
 const chance=upgradeChance(it);s.gold-=g;s.upgradeItems[upgradeMaterial(it)]--;if(n>=4)s.upgradeItems.protect--;
 if(rng()<chance){it.plus=n;it.upgradeFails=0;countActivity(s,'upgrade');}else it.upgradeFails=(it.upgradeFails||0)+1;
 return true;
}
export function gearShopPrice(slot,tier){return slot==='weapon'?1000+500*tier*tier:600+250*tier*tier;}
export function buyShopGear(s,slot,tier=tierForLevel(s.level)){if(!ENHANCE_SLOTS.includes(slot)||s.bag.length>=BAG_SIZE||!Number.isInteger(tier)||!TIERS[tier]||s.level<TIERS[tier].level)return false;const cost=gearShopPrice(slot,tier);const currency=slot==='weapon'?'gold':'stones';if(!Number.isFinite(s[currency])||s[currency]<cost)return false;s[currency]-=cost;s.bag.push(makeItem(slot,tier,2));return true;}



export function rollInsectArmor(m,rng=Math.random){
 if(rng()>=(m.boss?1:m.elite?.2:.04))return null;
 const ids=Object.keys(INSECT_ARMOR),insect=ids[Math.min(ids.length-1,Math.floor(rng()*ids.length))];
 const rarity=m.boss?2:m.elite?1:0;
 return {...makeItem('armor',tierForLevel(m.level),rarity,rng),insect};
}
