import {COIN_CAP,PROTECTION_CAP} from './chain-economy.js';
import {t,ui} from './i18n.js';
import {baseKillCoins,rollCoinAmount} from './token-economy.js';
import {reward} from './core.js';
import {itemName,BAG_SIZE} from './gear.js';
import {UPGRADE_ITEMS} from './upgrade-items.js';
import {POTIONS,addBottle} from './merchant.js';
export const LOOT_SECONDS=8,LOOT_RADIUS=65;
// XP and kill credit are immediate; all tangible rewards wait on the ground.
// One currency: monsters drop 50 + 1 COCKRO per monster level, bosses x10, capped by the
// player's daily budget (see token-economy.js). Bosses also have a 30% chance of a protection ticket. No equipment drops.
export const BOSS_PROTECTION_CHANCE=.3;
// Fallback for device (offline) worlds that have no shared economy: a launch-sized budget.
export function localKillReward(s,m,rng=Math.random){return rollCoinAmount(baseKillCoins({playerLevel:s.level||1,level:m.level||1,boss:!!m.boss,elite:!!m.elite}),rng);}
export function monsterRewards(s,m,rng=Math.random,coins=localKillReward){
 const amount=typeof coins==='function'?coins(s,m,rng):coins;
 reward(s,m,rng);
 const rewards=[];
 if(Number.isSafeInteger(amount)&&amount>0)rewards.push({kind:'cockro',count:amount});
 if(m.boss&&rng()<BOSS_PROTECTION_CHANCE)rewards.push({kind:'protection',count:1});
 return rewards;
}
// A hunting milestone places one reachable cache away from the kill and the pickup radius.
export function fieldGift(kills,level,monster,origin,trace,now,rng=Math.random){
 if(kills<=0||kills%12!==0)return null;
 const angle=rng()*Math.PI*2,distance=160+rng()*180;
 for(let i=0;i<8;i++){
  const heading=angle+i*Math.PI/4;
  const pos=trace(origin,{x:origin.x+Math.cos(heading)*distance,y:origin.y+Math.sin(heading)*distance});
  if(Math.hypot(pos.x-origin.x,pos.y-origin.y)<120)continue;
  const gift={kind:'fieldGift',x:pos.x,y:pos.y,created:now,expires:now+180,count:1};
  const tier=monster.level>=120?'Large':monster.level>=60?'Medium':'Small';
  gift.itemId=(rng()<.5?'hp':'mp')+tier;
  return gift;
 }
 return null;
}
export function lootName(d,hero){
 if(d.kind==='fieldGift'){
  const item=POTIONS[d.itemId];
  return t('กล่องของขวัญ')+' · '+(item?item.type.toUpperCase()+' +'+item.restore:'COCKRO');
 }
 return d.kind==='huntGold'?'COCKRO':d.kind==='protection'?t('ใบป้องกัน'):(d.kind==='cockro'||d.kind==='gold')?'COCKRO':d.kind==='material'?UPGRADE_ITEMS[d.itemId].name:itemName(d.item,hero);}
export function collectLoot(s,d){
 if(d.kind==='fieldGift')return !!d.itemId&&addBottle(s,d.itemId,d.count);
 if(d.kind==='gear'){if(!['weapon','ring','amulet'].includes(d.item?.slot))return false;if(s.bag.length>=BAG_SIZE)return false;s.bag.push(d.item);}
 else if(d.kind==='cockro'||d.kind==='gold'){if(!Number.isSafeInteger(d.count)||d.count<=0||!Number.isSafeInteger(s.stones)||s.stones+d.count>COIN_CAP)return false;s.stones+=d.count;}
 else if(d.kind==='protection'){const n=s.protectionTickets||0;if(!Number.isSafeInteger(d.count)||d.count<=0||n+d.count>PROTECTION_CAP)return false;s.protectionTickets=n+d.count;}
 else if(d.kind==='material'){if(!Object.hasOwn(UPGRADE_ITEMS,d.itemId))return false;const n=s.upgradeItems[d.itemId]||0;if(n+d.count>99999)return false;s.upgradeItems[d.itemId]=n+d.count;}
 else return false;return true;
}

