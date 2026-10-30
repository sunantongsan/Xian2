export const DAILY_GOLD=[3,4,5,6,7,8,15];
const DAY=86400000;
export const thaiDay=ms=>Math.floor((ms+7*3600000)/DAY);
export function normalizeCheckin(s,v=s){const c=v.checkin||{};s.checkin={lastDay:Number.isSafeInteger(c.lastDay)&&c.lastDay>=0?c.lastDay:null,streak:Number.isInteger(c.streak)?Math.max(0,Math.min(7,c.streak)):0};return s;}
export function checkinStatus(s,now=Date.now()){const today=thaiDay(now),c=s.checkin||{},last=c.lastDay;const claimed=Number.isInteger(last)&&last>=today;const day=claimed?Math.max(1,c.streak||1):last===today-1?(c.streak||0)%7+1:1;return {day,claimed,reward:DAILY_GOLD[day-1],today};}
export function claimCheckin(s,now=Date.now()){if(!Number.isFinite(now))return 0;normalizeCheckin(s);const status=checkinStatus(s,now);if(status.claimed||s.stones>1e7-status.reward)return 0;s.stones+=status.reward;s.checkin={lastDay:status.today,streak:status.day};return status.reward;}
