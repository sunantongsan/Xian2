import {COIN_CAP} from './chain-economy.js';

// Keep fractional hunting credit in integer tenths so repeated kills add exactly.
export function killBountyTenths(playerLevel,monster){
 const gap=playerLevel-(monster.level??playerLevel);
 const tenths=gap<=0?10:gap<10?8:gap<20?5:1;
 const matchedLevel=Math.min(playerLevel,monster.level||1);
 const huntingTier=1+Math.min(3,Math.floor(matchedLevel/40));
 return (monster.boss?10:monster.elite?3:1)*huntingTier*tenths;
}
export function bountyBalance(s){return s.bountyHeads+(s.bountyRemainder||0)/10;}
export function creditKillBounty(s,monster){
 const tenths=killBountyTenths(s.level,monster)+(s.bountyRemainder||0);
 s.bountyHeads=Math.min(Number.MAX_SAFE_INTEGER,s.bountyHeads+Math.floor(tenths/10));
 s.bountyRemainder=s.bountyHeads===Number.MAX_SAFE_INTEGER?0:tenths%10;
}

export function bountyRate(online){
 let threshold=100,rate=20;
 while(online>threshold){threshold*=10;rate*=2;}
 return rate;
}

export function exchangeBounty(save,online,quote){
 const rate=bountyRate(online),coins=quote.coins;
 if(quote.rate!==rate||quote.revision!==save.bountyRevision)return false;
 if(!Number.isSafeInteger(coins)||coins<1||coins>Math.floor(save.bountyHeads/rate))return false;
 if(coins>COIN_CAP-save.stones||save.bountyRevision>=Number.MAX_SAFE_INTEGER)return false;
 save.bountyHeads-=coins*rate;
 save.stones+=coins;
 save.bountyRevision++;
 return true;
}
