export const DAILY_GOLD=[200,300,400,500,600,800,1500];
export const CHECKIN_AD_MULTIPLIER=3;
const DAY=86400000;
export const thaiDay=ms=>Math.floor((ms+7*3600000)/DAY);

export function normalizeCheckin(s,v=s){
 const c=v.checkin||{};
 const lastDay=Number.isSafeInteger(c.lastDay)&&c.lastDay>=0?c.lastDay:null;
 const streak=Number.isInteger(c.streak)?Math.max(0,Math.min(7,c.streak)):0;
 // Keep receipts across midnight for delayed verified ads and overlapping requests.
 const receipts=(Array.isArray(c.receipts)?c.receipts:[]).filter(r=>r&&Number.isSafeInteger(r.day)&&r.day>=0&&r.day<=lastDay&&r.day>=lastDay-2&&Number.isSafeInteger(r.paid)&&r.paid>0).slice(-3);
 if(lastDay!==null&&!receipts.some(r=>r.day===lastDay))receipts.push({day:lastDay,paid:DAILY_GOLD[Math.max(1,streak)-1]});
 s.checkin={lastDay,streak,receipts};return s;
}
export function checkinStatus(s,now=Date.now(),divisor=1){const today=thaiDay(now),c=s.checkin||{},last=c.lastDay;const claimed=Number.isInteger(last)&&last>=today;const day=claimed?Math.max(1,c.streak||1):last===today-1?(c.streak||0)%7+1:1;return {day,claimed,reward:DAILY_GOLD[day-1]/divisor,today};}

function creditCheckin(s,day,streak,total){
 const c=s.checkin,previous=c.receipts.find(r=>r.day===day)?.paid||0;
 const amount=total-previous;
 if(amount<=0)return 0;
 if(s.stones>1e12-amount)throw Error('checkin_unavailable');
 s.stones+=amount;
 if(c.lastDay===null||day>c.lastDay){c.lastDay=day;c.streak=streak;}
 c.receipts=c.receipts.filter(r=>r.day!==day&&r.day>=c.lastDay-2);
 c.receipts.push({day,paid:total});
 return amount;
}
export function claimCheckin(s,now=Date.now(),divisor=1,scale=1){
 if(!Number.isFinite(now))return 0;
 normalizeCheckin(s);
 const status=checkinStatus(s,now,divisor);
 status.reward*=scale;
 if(status.claimed||s.stones>1e12-status.reward)return 0;
 return creditCheckin(s,status.today,status.day,status.reward);
}
export function claimVerifiedTripleCheckin(s,target){
 if(!Number.isSafeInteger(target?.day)||!Number.isInteger(target.streak)||!DAILY_GOLD[target.streak-1])throw Error('invalid_reward');
 normalizeCheckin(s);
 // Tickets issued before the cutover used the previous 100x schedule.
 const base=target.baseReward??(100*DAILY_GOLD[target.streak-1]/(target.divisor===2?2:1));
 if(!Number.isSafeInteger(base)||base<=0)throw Error('invalid_reward');
 return creditCheckin(s,target.day,target.streak,base*CHECKIN_AD_MULTIPLIER);
}
