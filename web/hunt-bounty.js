import {COIN_CAP} from './chain-economy.js';

// Keep fractional hunting credit in integer tenths so repeated kills add exactly.
export function killBountyTenths(playerLevel,monster){
 const gap=playerLevel-(monster.level??playerLevel);
 const tenths=gap<=0?10:gap<10?8:gap<20?5:1;
 const matchedLevel=Math.min(playerLevel,monster.level||1);
 const huntingTier=1+Math.min(3,Math.floor(matchedLevel/40));
 return (monster.boss?10:monster.elite?3:1)*huntingTier*tenths*(monster.depths?2:1);
}
export const GOLD_CAP=10000000000;
export const GOLD_PER_COCKRO=1;
export function bountyBalance(s){return s.gold+(s.bountyRemainder||0)/10;}
export function addHuntGold(s,tenths){
 if(!Number.isSafeInteger(tenths)||tenths<1)return false;
 const total=s.gold*10+(s.bountyRemainder||0)+tenths;
 if(!Number.isSafeInteger(total)||total>GOLD_CAP*10)return false;
 s.gold=Math.floor(total/10);s.bountyRemainder=total%10;return true;
}
export function buyGold(s,coins,revision){
 if(revision!==s.bountyRevision||revision>=Number.MAX_SAFE_INTEGER||!Number.isSafeInteger(coins)||coins<1||coins>s.stones)return false;
 if(!addHuntGold(s,coins*GOLD_PER_COCKRO*10))return false;
 s.stones-=coins;s.bountyRevision++;return true;
}

export function bountyRate(online){
 let threshold=100,rate=2;
 while(online>threshold){threshold*=10;rate*=2;}
 return rate;
}

export function exchangeBounty(save,online,quote){
 const rate=bountyRate(online),coins=quote.coins;
 if(quote.rate!==rate||quote.revision!==save.bountyRevision)return false;
 if(!Number.isSafeInteger(coins)||coins<1||coins>Math.floor(save.gold/rate))return false;
 if(coins>COIN_CAP-save.stones||save.bountyRevision>=Number.MAX_SAFE_INTEGER)return false;
 save.gold-=coins*rate;
 save.stones+=coins;
 save.bountyRevision++;
 return true;
}
