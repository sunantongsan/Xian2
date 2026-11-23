import {COIN_CAP} from './chain-economy.js';

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
