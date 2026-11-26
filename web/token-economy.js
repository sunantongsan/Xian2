// COCKRO single-currency economy (7.3.0). Everything is priced in baht and converted
// at the pre-launch rate, so designers think in money and players see one coin.
export const COCKRO_PER_THB=1_000_000; // launch price 0.000001 THB per COCKRO
export const thb=baht=>Math.round(baht*COCKRO_PER_THB);
export const toTHB=coins=>coins/COCKRO_PER_THB;
export const SUPPLY=100_000_000_000;
export const ALLOCATION=Object.freeze({farm:.85,presale:.04,reserve:.04,lp:.07});
export const DAILY_RELEASE=.001;       // share of the farm bucket released each Thai day
export const PIONEER_RELEASE=.01,PIONEER_DAYS=30; // first 30 days after 7.4.0: 1% a day
// Real players hunt 1-2 hours a day; the daily cap is two hours of full drops (8 THB).
export const PLAYER_DAILY_CAP=8_000_000;
export const MIN_DAU=100;              // budgets never assume fewer players than this
export const BURN_SHARE=.5;            // of every purchase; the rest returns to rewards
// Kill drops: 5,000 + 100 per monster level (Lv.1 5,100 · Lv.60 11,000 · Lv.120 17,000 ·
// Lv.240 29,000). Elites x3, bosses x10. Sized so a new player earns about 20 THB in
// 5 hours of hunting, i.e. 4 THB an hour; the daily cap stops bots after two hours.
export const KILL_BASE=5000,COCKRO_PER_MONSTER_LEVEL=100,ELITE_MULTIPLIER=3,BOSS_MULTIPLIER=10;
// Pioneer tier (internal, not shown in game): full drops for the first 100 accounts;
// 101-1,000 accounts 50%, 1,001-10,000 25%, and half again for every extra zero.
export function accountDropMultiplier(accounts=0){const n=Math.max(1,Math.floor(accounts)||1);return n<=100?1:.5**Math.ceil(Math.log10(n)-2);}
export function baseKillCoins({playerLevel=1,level=1,boss=false,elite=false,accounts=0}={}){
 const lv=Math.max(1,Math.floor(level)||1),gap=playerLevel-lv,penalty=gap<10?1:gap<20?.5:.1;
 return Math.floor((KILL_BASE+COCKRO_PER_MONSTER_LEVEL*lv)*(boss?BOSS_MULTIPLIER:elite?ELITE_MULTIPLIER:1)*penalty*accountDropMultiplier(accounts));
}
// Old balances were worth 5,000 COCKRO per 30 THB and G traded at 10 per COCKRO.
export const LEGACY_COIN_FACTOR=6000,LEGACY_G_FACTOR=600;
// Presale packs grow more expensive as the presale bucket sells out.
export const PRESALE_STEPS=Object.freeze([{sold:0,perTHB:1_000_000},{sold:.25,perTHB:850_000},{sold:.5,perTHB:700_000},{sold:.75,perTHB:600_000}]);
export const thaiDay=ms=>Math.floor((ms+7*3600000)/86400000);

export function freshEconomy(now=Date.now()){
 const part=k=>Math.round(SUPPLY*ALLOCATION[k]);
 return {version:1,farm:part('farm'),presale:part('presale'),presaleSold:0,reserve:part('reserve'),lp:part('lp'),
  burned:0,recycled:0,recycledPending:0,minted:0,day:thaiDay(now),launchDay:thaiDay(now),pool:0,poolStart:0,dauYesterday:0,accounts:0,players:{}};
}
const whole=v=>Number.isFinite(v)&&v>=0&&v<=Number.MAX_SAFE_INTEGER?Math.round(v):0;
export function normalizeEconomyState(v,now=Date.now()){
 const e=freshEconomy(now);if(!v||v.version!==1)return rollDay(e,now,true);
 for(const k of ['farm','presale','presaleSold','reserve','lp','burned','recycled','recycledPending','minted','referralIssued','pool','poolStart','dauYesterday','accounts'])e[k]=whole(v[k]);
 e.day=Number.isSafeInteger(v.day)?v.day:thaiDay(now);
 e.launchDay=Number.isSafeInteger(v.launchDay)?v.launchDay:null;
 if(e.launchDay===null){ // 7.4.0 upgrade: pioneer phase starts today; top today's pool up to 1%.
  e.launchDay=thaiDay(now);if(e.day===e.launchDay){const extra=Math.max(0,Math.floor(e.farm*PIONEER_RELEASE)-e.poolStart);e.farm-=extra;e.pool+=extra;e.poolStart+=extra;}
 }
 e.players={};for(const [id,n] of Object.entries(v.players||{}))if(/^[\w-]{1,80}$/.test(id))e.players[id]=whole(n);
 return rollDay(e,now);
}
// Start of a Thai day: unspent pool goes back to the farm, a new slice is released.
export function rollDay(e,now=Date.now(),force=false){
 const today=thaiDay(now);if(!force&&e.day===today)return e;
 e.farm+=e.pool;e.dauYesterday=Object.keys(e.players).length;
 const release=Math.floor(e.farm*releaseRate(e,today));e.farm-=release;
 e.pool=release+e.recycledPending;e.recycledPending=0;e.poolStart=e.pool;e.players={};e.day=today;return e;
}
export const activePlayers=e=>Math.max(MIN_DAU,e.dauYesterday,Object.keys(e.players).length);
export const dailyBudget=e=>Math.min(PLAYER_DAILY_CAP,Math.floor(e.poolStart/activePlayers(e)));
export const releaseRate=(e,day=e.day)=>day-(e.launchDay??day)<PIONEER_DAYS?PIONEER_RELEASE:DAILY_RELEASE;
export function earnedToday(e,id){return e.players[id]||0;}
// COCKRO for one kill, reserved from today's pool. Full rate until the budget is used,
// 10% up to 150% of it, then nothing; farther-below-level monsters pay less.
export function killReward(e,id,{playerLevel=1,level=1,boss=false,elite=false}={},now=Date.now()){
 rollDay(e,now);
 const budget=dailyBudget(e),earned=earnedToday(e,id);
 const rate=earned<budget?1:earned<budget*1.5?.1:0;
 const amount=Math.min(e.pool,Math.floor(baseKillCoins({playerLevel,level,boss,elite,accounts:e.accounts||0})*rate));
 if(amount<=0)return 0;
 e.pool-=amount;e.players[id]=earned+amount;e.minted+=amount;return amount;
}
// Fixed rewards (check-in, daily tasks) also come out of today's pool.
export function grant(e,id,amount,now=Date.now()){
 rollDay(e,now);const n=Math.min(e.pool,whole(amount));if(n<=0)return 0;
 e.pool-=n;e.players[id]=earnedToday(e,id)+n;e.minted+=n;return n;
}
// Uncollected drops are not lost: they go back to tomorrow's rewards.
export function refund(e,amount){const n=whole(amount);e.recycledPending+=n;e.minted=Math.max(0,e.minted-n);}
// Every purchase: half burned for good, half back into tomorrow's reward pool.
export function spend(e,amount){
 const n=whole(amount);if(!n)return {burned:0,recycled:0};
 const burned=Math.floor(n*BURN_SHARE),recycled=n-burned;
 e.burned+=burned;e.recycled+=recycled;e.recycledPending+=recycled;return {burned,recycled};
}
// Presale packs (before the coin launches): price per baht falls in steps as packs sell.
export function presaleRate(e){const sold=e.presaleSold/Math.round(SUPPLY*ALLOCATION.presale);let rate=PRESALE_STEPS[0].perTHB;for(const s of PRESALE_STEPS)if(sold>=s.sold)rate=s.perTHB;return rate;}
export function presaleCredit(e,baht){
 const want=Math.floor(baht*presaleRate(e));const fromPresale=Math.min(want,e.presale),fromReserve=Math.min(want-fromPresale,e.reserve);
 e.presale-=fromPresale;e.reserve-=fromReserve;e.presaleSold+=fromPresale;return fromPresale+fromReserve;
}
export function economySummary(e){return {burned:e.burned,recycled:e.recycled,farm:e.farm,pool:e.pool,poolStart:e.poolStart,dailyBudget:dailyBudget(e),releaseRate:releaseRate(e),pioneerDaysLeft:Math.max(0,PIONEER_DAYS-(e.day-e.launchDay)),activePlayers:activePlayers(e),presaleLeft:e.presale,presaleRate:presaleRate(e),reserve:e.reserve,lp:e.lp,minted:e.minted};}

// Redenominate a pre-7.3 save once: coins ×6000, G ×600 (10 G per old coin), G removed.
export function redenominate(s,v){
 if(v.economyVersion===3){s.economyVersion=3;return 0;}
 const before=s.stones,gold=Math.max(0,Math.floor(Number(v.gold)||0));
 const coins=Math.min(1e12,before*LEGACY_COIN_FACTOR+gold*LEGACY_G_FACTOR);
 s.stones=coins;s.gold=0;s.bountyRemainder=0;s.economyVersion=3;
 return coins-before;
}
// Coins created outside kill drops (rewards, refunds of legacy balances) come from
// today's pool first, then from the farm bucket.
export function mint(e,amount){const n=whole(amount);const a=Math.min(e.pool,n);e.pool-=a;e.farm-=Math.min(e.farm,n-a);e.minted+=n;return n;}
