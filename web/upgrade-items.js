import {ENHANCE_SLOTS} from './enhancement.js';
// Rare upgrade gold is stored as stones; ordinary spending money remains gold (G).
export const UPGRADE_ITEMS={
 alloy:{name:'หินเสริมพลัง',price:15,description:'ตีบวกอาวุธ แหวน และสร้อย +1 ถึง +9 • ครั้งละ 1 ก้อน',icon:'items/glowstone.webp'},
 protect:{name:'ผลึกพิทักษ์',price:30,description:'ป้องกันอุปกรณ์ในการตีบวก +4 ถึง +9 • ครั้งละ 1 ชิ้น',icon:'items/diamond.webp'},
 meteor:{name:'หินอุกาบาศ',price:20,description:'สุ่มคุณสมบัติพิเศษ • ฟื้น HP 2% ทุก 2 วินาที (รวมสูงสุด 4%) มีโอกาสสุ่ม 5%',icon:'items/meteor.webp'},
 crystal:{name:'ผลึก',price:35,description:'เสริมโจมตี +8 ต่อขั้น',stat:'atk',amount:8,icon:'items/crystal.webp'},
 glowstone:{name:'หินเรืองแสง',price:35,description:'เสริมป้องกัน +4 ต่อขั้น',stat:'def',amount:4,icon:'items/glowstone.webp'},
 diamond:{name:'เพชร',price:60,description:'เสริมโอกาสคริติคอล +0.5% ต่อขั้น',stat:'crit',amount:.005,icon:'items/diamond.webp'},
 ruby:{name:'ทับทิม',price:40,description:'เสริม HP +60 ต่อขั้น',stat:'hp',amount:60,icon:'items/ruby.webp'}
};
export const GEM_IDS=['crystal','glowstone','diamond','ruby'];
export const GEM_CAP=1;
const bounded=(v,max)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
export function normalizeUpgradeItems(s,v=s){s.upgradeItems=Object.fromEntries(Object.keys(UPGRADE_ITEMS).map(id=>[id,bounded(v.upgradeItems?.[id],99999)]));return s;}
export function normalizeGems(gems){return Object.fromEntries(GEM_IDS.map(id=>[id,bounded(gems?.[id],GEM_CAP)]));}
export function buyUpgradeItem(s,id){if(!Object.hasOwn(UPGRADE_ITEMS,id))return false;normalizeUpgradeItems(s);const item=UPGRADE_ITEMS[id];if(s.stones<item.price||s.upgradeItems[id]>=99999)return false;s.stones-=item.price;s.upgradeItems[id]++;return true;}
export function socketGem(s,slot,id){if(!GEM_IDS.includes(id)||!ENHANCE_SLOTS.includes(slot))return false;const it=s.equip?.[slot];if(!it)return false;normalizeUpgradeItems(s);if(s.upgradeItems[id]<1)return false;const old=GEM_IDS.find(k=>(it.gems?.[k]||0)>0);if(old===id)return false;if(old&&s.upgradeItems[old]>=99999)return false;s.upgradeItems[id]--;if(old)s.upgradeItems[old]++;it.gems=normalizeGems({[id]:1});return true;}
