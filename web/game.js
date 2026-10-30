import {DAILY_TASKS,dailyState,claimActivity} from './daily-activities.js';
import {GameAudio} from './game-audio.js';
import {ENHANCE_SLOTS,MAX_PLUS,rerollSpecial,specialInfo,auraLevel,applyRegen,exchangeGold} from './enhancement.js';
import {inventoryEntries,inventoryKey} from './inventory.js';
import {RewardedAdsClient} from './rewarded-ads.js';
import {DAILY_GOLD,checkinStatus,claimCheckin} from './checkin.js';
import {UPGRADE_ITEMS,GEM_IDS,GEM_CAP,buyUpgradeItem,socketGem} from './upgrade-items.js';
import {manaRegen} from './balance.js';
import {FASHION_SETS,FASHION_ITEMS,normalizeFashion,wearFashion,removeFashion,appearance} from './fashion.js';
import {drawFashionIcon} from './fashion-render.js';
import {drawAdvancedMonster} from './monster-render.js';
import {OnlineClient} from './online.js';
import {CRICKET_WALK,prepareCricketWalk} from './cricket-walk.js';
import {AutoHunt} from './auto-hunt.js';
import {drawCombatEffect} from './combat-vfx.js';
import {makePopulation,updateRespawns} from './alien-population.js';
import {HERO_CLASSES,uiArt,menuTile,heroIdentity} from './hero-ui.js';
import {MAPS,REGIONS,regionAt,mapSize,MAP_W,MAP_H,toWorld,toUV,walkable,traceStep,routeTo} from './maps.js';
import {parseTiled,zoneAt} from './tilemap.js';
import {createStarRenderer,drawGate,buildMinimap,minimapPoint} from './star-render.js';
import {STAR_ZONES,starMonster} from './star-data.js';
import {SLOTS,SLOT_ORDER,TIERS,RARITY,BAG_SIZE,itemName,itemStats,itemPower,sellPrice,rollDrop,addToBag,canEquip,equip,unequip,sell,heroPower,gearUpgradeCost,gearUpgradeG,upgradeGear,buyShopGear,gearShopPrice,tierForLevel} from './gear.js';
import {drawHero,CLASS_SHEETS} from './hero-animation.js';
import {FORMS,ELEMENTS,MODS,compileSkill,knownSkills,craft,skillTargets} from './skills.js';
import {ZONES,MONSTERS,HEROES} from './catalog.js';
import {allocateStat,trainSkill,combatStats,reputationTitle,fresh,maxHP,damage,reward,xpNeed,buyPotion,buyMPPotion,upgrade,upgradeCost,unlocked,validSave,inCone} from './core.js';
const $=id=>document.getElementById(id), cv=$('game'),ctx=cv.getContext('2d',{alpha:false}),modal=$('modal');
const images=new Map(), pendingImages=new Map();
const autoHunt=new AutoHunt();
const gameAudio=new GameAudio();let forgePending=null;let forgeTimer=null;
document.addEventListener('pointerdown',()=>gameAudio.sync(s?.sound===true),{passive:true});
document.addEventListener('visibilitychange',()=>gameAudio.sync(s?.sound===true));
let travelBusy=false, bookRequest=0,scene=null,route=[],pendingPoi=null;
let mapZoom=.8;
// ดาวฮีโร่ open world: parsed tile map, renderer, camps (spawn points) and minimap.
let star=null,starRender=null,starMini=null,starZone=-1,starCamps=[],starClock=0;
const isStar=()=>scene?.type==='tiles';
const SAVE='road-to-immortality-v1';
let serverTimeOffset=0;
let onlineMode=false,onlineEvent=0,onlineView=null,onlinePaint=0;
const onlineBadge=document.createElement('button');onlineBadge.id='onlineStatus';onlineBadge.hidden=true;onlineBadge.setAttribute('aria-live','polite');document.body.appendChild(onlineBadge);
onlineBadge.onclick=()=>toast('บัญชีออนไลน์ทดสอบผูกกับเครื่องนี้ • เซฟออฟไลน์แยกกัน');
const net=new OnlineClient(applyOnlineState,text=>{onlineBadge.textContent=text;onlineBadge.hidden=!onlineMode;});
net.onReconnect=()=>{onlineEvent=0;if(onlineMode&&p)goHome();};
let adPending=false,adTimeout,adMessage="",testTicket=null,purchasePending=null,purchaseTimer;
let adScreenOpen=false,pendingCelebration=null;
function celebrateReward(){
 if(!pendingCelebration||adScreenOpen||document.hidden)return;
 const reward=pendingCelebration;pendingCelebration=null;
 if(reward.item?.startsWith('restore:')){forge();toast('คืนคุณสมบัติเดิมแล้ว • ไม่คืนหิน');gameAudio.success();return;}const item=UPGRADE_ITEMS[reward.item];if(!item)return;
 show(`<section class="reward-celebration" aria-labelledby="rewardTitle"><div class="reward-stars" aria-hidden="true">✦ ✧ ✦</div><h2 id="rewardTitle">ยินดีด้วย!</h2><div class="reward-prize"><img src="${item.icon}" alt="${escapeHTML(item.name)}"><b>×1</b></div><h3>${escapeHTML(item.name)}</h3><p>ไอเท็มเข้ากระเป๋าแล้ว</p>${button('claimAdReward','รับรางวัล')}</section>`);
 $('claimAdReward').onclick=()=>{inventoryFilter='material';inventorySelected='material:'+reward.item;onlineInventory();$('inventoryGrid').scrollTop=0;};
 rewardFanfare();
}
document.addEventListener('visibilitychange',celebrateReward);
const shopAmounts=()=>JSON.stringify([s?.gold,s?.stones,s?.potions,s?.mpPotions,s?.upgradeItems]);
function adNotice(message){adMessage=message;const label=document.getElementById("adMessage");if(label)label.textContent=message;toast(message);}
const ads=new RewardedAdsClient(state=>{
 if(state.status==='loading')adScreenOpen=true;
 if(['dismissed','unavailable','error'].includes(state.status))adScreenOpen=false;
 const versionLabel=document.getElementById("adsNativeVersion");if(versionLabel)versionLabel.textContent=Number.isInteger(state.nativeCode)?String(state.nativeCode):"—";
 const text={loading:'กำลังโหลดโฆษณา…',unavailable:'ยังไม่มีโฆษณาให้ดู กรุณาลองใหม่',error:'เปิดโฆษณาไม่สำเร็จ',verifying:'ดูจบแล้ว • รอเซิร์ฟเวอร์ยืนยันรางวัล', 'test-earned':'ดูจบแล้ว • กำลังรับไอเท็มทดสอบ'}[state.status];
 if(text)adNotice(state.diagnostic||text);
 if(state.status==='test-earned'&&testTicket){net.send({type:'testAdComplete',nonce:testTicket.nonce});}
 if(['dismissed','unavailable','error'].includes(state.status)){adPending=false;clearTimeout(adTimeout);}
 if(onlineView==='shop'&&modal.open)refreshOnlineShop();
 else document.querySelectorAll('[data-reward-item]').forEach(b=>{b.disabled=!ads.supported||!state.ready||adPending||!state.test;if(!b.dataset.rewardItem.startsWith('restore:'))b.textContent=state.test?'ดูโฆษณาทดสอบ • รับ 1 ชิ้น':'ดูโฆษณา • รับ 1 ชิ้น';});
 celebrateReward();
});
net.onOpResult=()=>{if(forgePending){const before=forgePending;forgePending=null;clearTimeout(forgeTimer);const it=s.equip?.[before.slot];if(it&&JSON.stringify(it)!==before.signature){if(before.op==='rerollSpecial'){forge();toast('สุ่มได้ '+specialInfo(it.special).name);gameAudio.success();}else celebrateUpgrade(it,before.stats);}else toast('ยังอัปเกรดไม่ได้ กรุณาตรวจวัสดุและเงิน');}if(!purchasePending)return;const changed=purchasePending!==shopAmounts();purchasePending=null;clearTimeout(purchaseTimer);const label=$('purchaseStatus');if(label)label.textContent=changed?'ซื้อสำเร็จ • บันทึกแล้ว':'ยังซื้อไม่ได้ กรุณาตรวจยอดเงินแล้วลองใหม่';if(onlineView==='shop')refreshOnlineShop();};
net.onAdReward=reward=>{testTicket=null;adPending=false;clearTimeout(adTimeout);if(reward.duplicate)return;adMessage='';pendingCelebration=reward;celebrateReward();};
net.onAdTicket=ticket=>{if(ticket.test)testTicket=ticket;if(!adPending||!onlineMode)return;clearTimeout(adTimeout);if(!ads.show(ticket)){adPending=false;adNotice('ติดต่อระบบโฆษณาในแอปไม่สำเร็จ กรุณาปิดแล้วเปิดแอปใหม่');return;}adNotice('กำลังโหลดวิดีโอโฆษณา…');};
net.onAdError=message=>{adPending=false;clearTimeout(adTimeout);adNotice(message==='test_limit'?'รับไอเท็มทดสอบครบ 20 ครั้งแล้ว':message==='ad_pending'?'รอคำขอโฆษณาก่อนหน้า แล้วลองใหม่อีกสักครู่':'ระบบโฆษณายังไม่พร้อม • '+message);};
function bindRewardAds(){document.querySelectorAll('[data-reward-item]').forEach(b=>b.onclick=()=>{
 if(adPending)return;
 if(ads.state.test){if(!net.ready||!net.testRewards){adNotice('รอเชื่อมต่อระบบรางวัลทดสอบ');return;}adPending=true;if(!net.send({type:'testAdTicket',item:b.dataset.rewardItem})){adPending=false;return;}adNotice('กำลังเตรียมไอเท็มทดสอบ…');clearTimeout(adTimeout);adTimeout=setTimeout(()=>{adPending=false;adNotice('คำขอหมดเวลา กรุณาลองใหม่');},15000);return;}
 if(!onlineMode||!net.ready){adNotice('การเชื่อมต่อออนไลน์ขาด กรุณารอเชื่อมต่อใหม่');return;}
 if(!net.adsEnabled||!ads.state.ready){adNotice('ระบบโฆษณายังไม่พร้อม กรุณาลองใหม่');ads.refresh();return;}
 adPending=true;adNotice('กำลังขอสิทธิ์ดูโฆษณาจากเซิร์ฟเวอร์…');
 if(!net.send({type:'adTicket',item:b.dataset.rewardItem})){adPending=false;adNotice('ส่งคำขอไม่สำเร็จ กรุณารอเชื่อมต่อออนไลน์ใหม่');return;}
 clearTimeout(adTimeout);adTimeout=setTimeout(()=>{adPending=false;adNotice('เซิร์ฟเวอร์ไม่ตอบคำขอโฆษณา กรุณาลองใหม่');},15000);
});}
setTimeout(()=>ads.refresh(),0);
function applyOnlineState(d){
 if(Number.isFinite(d.serverTime))serverTimeOffset=d.serverTime-Date.now();
 if(!onlineMode||!p||!s||travelBusy)return;
 const current=isStar()?'star':town?'town':'forest';if(d.self.map!==current)return;
 for(const [id,item] of Object.entries(UPGRADE_ITEMS)){if((d.self.save.upgradeItems?.[id]||0)>(s.upgradeItems?.[id]||0)&&adPending)toast('ได้รับ '+item.name+' • บันทึกแล้ว');}
 const oldForge=JSON.stringify([s.equip,s.upgradeItems,s.gold,s.stones]);const oldKills=s.kills,oldLevel=s.level;const prefs={sound:s.sound,quality:s.quality,autoAttack:s.autoAttack};s={...d.self.save,...prefs};
 if(d.self.correction||Math.hypot(p.x-d.self.x,p.y-d.self.y)>70)Object.assign(p,{x:d.self.x,y:d.self.y});
 p.hp=d.self.hp;p.mp=d.self.mp;p.dead=p.hp<=0;if(p.dead)p.anim='dead';
 cooldown.attack=d.self.cooldowns.attack||0;cooldown.dash=d.self.cooldowns.dash||0;cooldown.potion=d.self.cooldowns.potion||0;cooldown.mpPotion=d.self.cooldowns.mpPotion||0;
 for(const r of knownSkills(s))skillTimers[r.id]=d.self.cooldowns[r.id]||0;
 const old=new Map(enemies.map(e=>[e.id,e]));enemies=d.monsters.map(e=>Object.assign(old.get(e.id)||{},e));if(target)target=enemies.find(e=>e.id===target.id)||null;
 for(const r of d.players)if(!images.has('heroes/'+r.hero+'.webp')&&r.hero!=='sword-cockro')loadImage('heroes/'+r.hero+'.webp').catch(()=>{});
 for(const e of d.events){if(e.id<=onlineEvent)continue;onlineEvent=Math.max(onlineEvent,e.id);if(e.kind==='hit')floating(e.x,e.y,String(e.amount),'#ffe6a1');else if(e.kind==='attack')effects.push({type:'slash',x:e.x,y:e.y,color:'#a1eaff',life:.22,max:.22});else if(e.kind==='skill'){effects.push({...e,type:'technique',life:.85,max:.85});if(e.player===d.self.id)gameAudio.explosion();}if(e.player===d.self.id&&['skill','attack'].includes(e.kind)){p.anim=e.kind;p.animTime=0;p.animDuration=e.kind==='skill'?.6:.46;p.castId=e.skillId;}}
 if(s.kills>oldKills)beep(700,.1);if(s.level>oldLevel)toast('เลเวล '+s.level+' • บันทึกบนเซิร์ฟเวอร์แล้ว');
 if(p.dead&&!$('onlineRevive')){show(`<h2>พลังงานหมด</h2><p>ความคืบหน้าบันทึกบนเซิร์ฟเวอร์แล้ว</p>${button('onlineRevive','เกิดที่หมู่บ้าน')}`);$('onlineRevive').onclick=()=>{net.send({type:'revive'});goHome();};}
 if(onlineView==='shop'&&modal.open)refreshOnlineShop();
 if(onlineView==='stats'&&modal.open&&lastInventoryKey!==inventoryKey(s))onlineInventory();
 if(onlineView&&!forgePending&&(onlineView!=='forge'||oldForge!==JSON.stringify([s.equip,s.upgradeItems,s.gold,s.stones]))&&onlineView!=='shop'&&onlineView!=='stats'&&modal.open&&performance.now()-onlinePaint>1000){const focus=document.activeElement;if(!focus||focus.tagName!=='SELECT')onlineView==='wardrobe'?updateWardrobe():onlineMenu(onlineView);}hud();
}
function onlineAttack(){if(!p||p.dead||town||paused||!net.ready||cooldown.attack>0)return;const e=target?.hp>0?target:enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(!e)return;if(Math.hypot(e.x-p.x,e.y-p.y)>attackRange()){target=e;return;}cooldown.attack=.46;net.send({type:'attack',target:e.id});}
function drawEnhanceAura(g,x,y,size,t,n){if(n<3)return;g.save();g.globalCompositeOperation='lighter';g.strokeStyle=n>=9?'#ffe697':n>=6?'#d689ff':'#79dcff';g.fillStyle=g.strokeStyle;g.globalAlpha=.65;g.lineWidth=n>=9?3:2;g.beginPath();g.ellipse(x,y,size*.34,size*.11,0,0,Math.PI*2);g.stroke();const count=s?.quality==='low'?3:n>=9?9:5;for(let i=0;i<count;i++){const a=t*1.2+i*Math.PI*2/count;g.beginPath();g.arc(x+Math.cos(a)*size*.3,y-size*.2-((t*25+i*17)%(size*.55)),n>=9?2.5:1.7,0,7);g.fill();}g.restore();}
function drawRemote(e){if(!visibleActor(e))return;const q=project(e.x,e.y),size=110*scale;ctx.save();ctx.fillStyle='#25e4bd55';ctx.beginPath();ctx.ellipse(q.x,q.y,28*scale,11*scale,0,0,7);ctx.fill();drawHero(ctx,images,e.hero,e,q.x,q.y,size);drawEnhanceAura(ctx,q.x,q.y,size,time,e.auraLevel||0);ctx.textAlign='center';ctx.font='bold 12px GameThai,sans-serif';ctx.strokeStyle='#071421';ctx.lineWidth=3;const label=e.name+' Lv.'+e.level;ctx.strokeText(label,q.x,q.y-size-14);ctx.fillStyle='#8fffd9';ctx.fillText(label,q.x,q.y-size-14);ctx.fillRect(q.x-25,q.y-size-9,50*Math.max(0,e.hp/e.maxHp),4);ctx.restore();}
function refreshOnlineShop(){
 if(!s)return;
 const set=(id,text)=>{const el=$(id);if(el&&el.textContent!==text)el.textContent=text;};
 set('shopBalance',`${s.gold.toLocaleString()} G • ทอง ${s.stones.toLocaleString()}`);
 set('hpStock',`ฟื้น HP 50% • คูลดาวน์ 4 วินาที • มี ${s.potions}`);
 set('mpStock',`ฟื้น MP 50% • คูลดาวน์ 6 วินาที • มี ${s.mpPotions}`);
 document.querySelectorAll('[data-stock]').forEach(el=>{const text=`มี ${s.upgradeItems?.[el.dataset.stock]||0} ชิ้น`;if(el.textContent!==text)el.textContent=text;});
 document.querySelectorAll('[data-op]').forEach(b=>{const price=b.dataset.op==='buy'?50:b.dataset.op==='buyMP'?60:b.dataset.op==='exchangeGold'?Number(b.dataset.amount):b.dataset.op==='buyShopGear'?gearShopPrice(b.dataset.slot,tierForLevel(s.level)):UPGRADE_ITEMS[b.dataset.id]?.price;const funds=['buyUpgradeItem','buyShopGear','exchangeGold'].includes(b.dataset.op)?s.stones:s.gold;b.disabled=!!purchasePending||!net.ready||funds<price;});
 document.querySelectorAll('[data-reward-item]').forEach(b=>{b.disabled=!ads.supported||!ads.state.ready||adPending||(!ads.state.test&&(!net.ready||!net.adsEnabled));b.textContent=ads.state.test?'ดูโฆษณาทดสอบ • รับ 1 ชิ้น':'ดูโฆษณา • รับ 1 ชิ้น';});
}
function onlineMenu(view){if(view==='stats')return onlineInventory();onlineView=view;onlinePaint=performance.now();let html='';
 if(view==='checkin')html=checkinHTML(true)+dailyHTML(true);
 if(view==='shop')html=shopHTML(true);
 if(view==='forge')html=forgeHTML(true);
 if(view==='attributes')html=`<h2>ฮีโร่ออนไลน์ • Lv.${s.level}</h2><p>แต้มสถานะ ${s.statPoints} • ${s.gold.toLocaleString()} G</p><div class="grid">${Object.entries(s.attributes).map(([k,v])=>`<button data-op="stat" data-key="${k}">${k.toUpperCase()} ${v} +</button>`).join('')}</div><h3>อุปกรณ์</h3><div class="grid">${Object.entries(s.equip).filter(([,it])=>it).map(([slot,it])=>`<button data-op="unequip" data-slot="${slot}">ถอด ${escapeHTML(itemName(it,s.hero))}</button>`).join('')}</div><h3>กระเป๋า</h3><div class="grid">${s.bag.map(it=>`<article class="card"><b>${escapeHTML(itemName(it,s.hero))}</b><button data-op="equip" data-id="${it.id}">สวมใส่</button><button data-op="sell" data-id="${it.id}">ขาย • ${sellPrice(it)} G</button></article>`).join('')}</div>`;
 if(view==='skills')html=`<h2>ทักษะออนไลน์</h2><p>แต้มวิชา ${s.skillPoints}</p><div class="grid">${knownSkills(s).map(r=>`<article class="card"><b>${escapeHTML(r.name)} • Lv.${r.level}</b><button data-op="train" data-id="${r.id}">ฝึก • ระดับ ${(s.skillRanks[r.id]||0)+1}</button>${[0,1,2,3,4].map(slot=>`<button data-op="equipSkill" data-id="${r.id}" data-slot="${slot}">${s.equipped[slot]===r.id?'✓ ':''}ช่อง ${slot+1}</button>`).join('')}</article>`).join('')}</div>`;
 show(html+(view==='stats'?button('fashionBag','กระเป๋าแฟชั่น • หมวกและชุด'):'')+button('onlineBack','กลับ'));if($('fashionBag'))$('fashionBag').onclick=wardrobe;onlineView=view;document.querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>{const purchase=view==='shop';if(['upgradeGear','socketGem','rerollSpecial'].includes(b.dataset.op)){if(forgePending)return;const it=s.equip[b.dataset.slot];forgePending={slot:b.dataset.slot,op:b.dataset.op,signature:JSON.stringify(it),stats:statLine(it)};clearTimeout(forgeTimer);forgeTimer=setTimeout(()=>{forgePending=null;toast('ยังไม่ได้รับคำยืนยัน ตรวจอุปกรณ์ก่อนลองอีกครั้ง');},8000);b.disabled=true;}if(purchase){if(purchasePending)return;purchasePending=shopAmounts();clearTimeout(purchaseTimer);purchaseTimer=setTimeout(()=>{purchasePending=null;const label=$('purchaseStatus');if(label)label.textContent='ยังไม่ได้รับคำยืนยัน กรุณาตรวจจำนวนของก่อนลองใหม่';if(onlineView==='shop')refreshOnlineShop();},8000);b.disabled=true;const label=$('purchaseStatus');if(label)label.textContent='กำลังยืนยันการซื้อ…';}const sent=net.send({type:'op',op:b.dataset.op,id:b.dataset.id,key:b.dataset.key,amount:b.dataset.amount,slot:b.dataset.op==='equipSkill'?Number(b.dataset.slot):b.dataset.slot});if(!sent&&forgePending){forgePending=null;clearTimeout(forgeTimer);toast('ส่งคำขอไม่ได้ กรุณารอเชื่อมต่อใหม่');}if(purchase&&!sent){purchasePending=null;clearTimeout(purchaseTimer);const label=$('purchaseStatus');if(label)label.textContent='ยังส่งคำขอไม่ได้ กรุณารอเชื่อมต่อใหม่';}});if(view==='shop'||view==='forge')bindRewardAds();$('onlineBack').onclick=()=>{onlineView=null;menu();};
}
let s=null,p=null,zone=0,town=true,enemies=[],effects=[],projectiles=[],drops=[],target=null,move=null,keys=new Set(),time=0,last=0,saveClock=0,spawnClock=0,toastClock=0,attackHeld=false,screenW=0,screenH=0,scale=1,paused=false,audio=null;
let attackPointer=null;
const stick={id:null,x:0,y:0};
function resetControls(){stick.id=null;stick.x=stick.y=0;attackPointer=null;attackHeld=false;keys.clear();$('joystickThumb').style.transform='translate(-50%,-50%)';$('joystick').classList.remove('active');}
let cooldown={attack:0,skill:0,dash:0,potion:0};
const palette=[['#669b78','#acd4a3'],['#658e96','#b5cebf'],['#7a7c83','#a7a999'],['#bb9563','#efd49b'],['#785c55','#b68464'],['#8cb4c3','#d6ebeb'],['#597e62','#a5ba76'],['#675564','#a38a88'],['#8bb5b8','#d5e4d6'],['#928fb1','#e6dbc4']];
function toast(text){$('toast').textContent=text;$('toast').style.opacity=1;toastClock=3;}
function resize(){screenW=innerWidth;screenH=innerHeight;const d=Math.min(devicePixelRatio||1,s?.quality==='low'?1:1.5);cv.width=screenW*d;cv.height=screenH*d;ctx.setTransform(d,0,0,d,0,0);scale=Math.min(screenW/900,screenH/600);scale=Math.max(.55,Math.min(1.4,scale))*(scene?mapZoom:1);if(scene&&!isStar())scale=Math.max(scale,screenW/mapSize(scene).width,screenH/mapSize(scene).height);}
addEventListener('resize',resize);resize();
function loadImage(url){
 if(images.has(url))return Promise.resolve(images.get(url));
 if(pendingImages.has(url))return pendingImages.get(url);
 const task=new Promise((ok,no)=>{const im=new Image();im.onload=()=>{images.set(url,im);ok(im)};im.onerror=()=>no(new Error('โหลดภาพไม่สำเร็จ: '+url));im.src=url;}).finally(()=>pendingImages.delete(url));
 pendingImages.set(url,task);return task;
}
async function loadZone(){await loadImage('sprites/alien-forest.webp');}
function save(){if(onlineMode)return true;if(!s)return;try{localStorage.setItem(SAVE,JSON.stringify(s));return true}catch{toast('บันทึกไม่สำเร็จ กรุณาตรวจพื้นที่เครื่อง');return false}}
function readSave(){try{return validSave(JSON.parse(localStorage.getItem(SAVE)))}catch{return null}}
function beep(freq=440,dur=.07){if(!s?.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=freq;g.gain.setValueAtTime(.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.start();o.stop(audio.currentTime+dur)}catch{}}
function rewardFanfare(){gameAudio.sync(s?.sound===true);gameAudio.success();}

function show(html){onlineView=null;setQuickMenu(false);paused=true;resetControls();move=null;target=null;route=[];pendingPoi=null;$('modalContent').innerHTML=html;$('windowClose').hidden=!p||travelBusy;if(!modal.open)modal.showModal();}
function close(){onlineView=null;bookRequest++;modal.close();paused=travelBusy||document.hidden;}
modal.addEventListener('cancel',e=>{if(!p||travelBusy){e.preventDefault();return}bookRequest++;paused=document.hidden});
const button=(id,text)=>`<button id="${id}">${text}</button>`;
function atlas(g,im,col,row,cols,rows,x,y,w,h,flip=false){if(!im)return;const cw=im.width/cols,ch=im.height/rows;g.save();g.translate(x,y);if(flip)g.scale(-1,1);g.drawImage(im,col*cw,row*ch,cw,ch,-w/2,-h,w,h);g.restore();}
function previewHeroes(){HEROES.forEach(h=>{const c=$('preview-'+h.id);if(c)drawHero(c.getContext('2d'),images,h.id,{face:1,anim:'idle',walkDX:1,walkDY:0},c.width/2,c.height-5,118);});}
function setQuickMenu(open){$('quickMenuToggle').setAttribute('aria-expanded',String(open));$('quickMenuTray').classList.toggle('open',open);$('quickMenuTray').inert=!open;}
$('shopShortcut').onclick=()=>{if(s&&p&&!travelBusy)shop();};$('checkinShortcut').onclick=()=>{if(s&&p&&!travelBusy)checkinMenu();};
$('quickMenuToggle').onclick=()=>setQuickMenu($('quickMenuToggle').getAttribute('aria-expanded')!=='true');
let titleRequest=0;
async function title(){
 const request=++titleRequest;net.disconnect();onlineMode=false;$('onlineStatus').hidden=true;document.body.classList.add('welcome-screen');
 show('<h1>COCKRO</h1><h2>กำเนิดฮีโร่แมลง</h2><p>กำลังโหลดตัวละคร…</p><button id="choose" disabled>เล่น</button>');
 let owned;try{owned=await net.roster();}catch(error){if(request!==titleRequest)return;show(`<h1>COCKRO</h1><p>${escapeHTML(error.message)}</p>${button('choose','ลองใหม่')}`);$('choose').onclick=title;return;}
 if(request!==titleRequest)return;
 const cards=owned.length?owned.map(c=>({...heroIdentity(c.hero),id:c.hero,level:c.level})):HERO_CLASSES.filter(h=>h.playable);
 let selected=cards[0]?.id;
 show(`<h1>COCKRO</h1><h2>${owned.length?'เลือกตัวละครของคุณ':'เลือกอาชีพตัวละครแรก'}</h2><div class="grid hero-grid welcome-roster">${cards.map(h=>`<button class="card hero-card" data-roster-hero="${h.id}" aria-pressed="${h.id===selected}" style="--hero-accent:${h.color||'#d9b85d'}">${uiArt(h.icon,'hero-art')}<b>${h.name}</b><small>${owned.length?'เลเวล '+h.level:h.description}</small></button>`).join('')}</div>${button('choose','เล่น')}${button('privacy','ความเป็นส่วนตัว')}<p class="sub">4.16.0 • ออนไลน์</p>${!owned.length&&readSave()?'<p class="sub">เซฟเก่ายังเก็บในเครื่อง ตัวละครออนไลน์เริ่มแยกจากเซฟเดิม</p>':''}`);
 document.querySelectorAll('[data-roster-hero]').forEach(b=>b.onclick=()=>{selected=b.dataset.rosterHero;document.querySelectorAll('[data-roster-hero]').forEach(c=>c.setAttribute('aria-pressed',String(c.dataset.rosterHero===selected)));});
 $('choose').onclick=()=>{if(!selected)return;++titleRequest;onlineMode=true;start({hero:selected});};$('privacy').onclick=()=>{++titleRequest;privacy();};
}

async function start(data){onlineMode=true;{show('<h2>กำลังเชื่อมต่อเซิร์ฟเวอร์…</h2><p>กำลังโหลดตัวละครที่บันทึกบนเซิร์ฟเวอร์</p>');try{data=await net.connect(data.hero);}catch(e){net.disconnect();onlineMode=false;title();toast(e.message);return;}}document.body.classList.remove('welcome-screen');if(CLASS_SHEETS.includes(data.hero)){try{await loadImage('heroes/'+data.hero+'.webp');if(data.hero==='sword-cricket'&&!images.has('cricket-walk-prepared'))images.set('cricket-walk-prepared',prepareCricketWalk(await loadImage(CRICKET_WALK)));}catch{toast('โหลดตัวละครไม่ได้');return;}}else if(data.hero!=='sword-cockro'){try{await Promise.all(['walk','actions'].map(state=>loadImage('heroes/'+data.hero+'-'+state+'.webp')));}catch{toast('โหลดตัวละครเดิมไม่ได้');return;}}s=data;normalizeFashion(s);await loadFashionAssets();p={x:0,y:0,hp:maxHP(s),face:1,anim:'idle',animTime:0,walkDistance:0,walkDX:.707,walkDY:.707,back:false,inv:0,dead:false};cooldown={attack:0,skill:0,dash:0,potion:0};skillTimers={};p.mp=maxMP();close();$('hud').hidden=false;$('controls').hidden=false;$('hint').hidden=false;resize();if(await goHome()){save();toast('ยินดีต้อนรับสู่หมู่บ้านฮีโร่');}}
async function travel(z,toTown=false,regionId=0){
 z=0;
 if(travelBusy||!s||!p)return false;
 if(!Number.isInteger(z)||!ZONES[z]||(!toTown&&!unlocked(s,z))){toast('ต้องถึงระดับพื้นที่และกำจัดบอสเขตก่อนหน้า');return false;}
 travelBusy=true;paused=true;bookRequest++;keys.clear();attackHeld=false;
 show(`<h2>กำลังเดินทาง…</h2><p>กำลังเตรียม ${toTown?'สถานีออโรรา':ZONES[z].name}</p>`);
 try{
  autoHunt.reset();const nextScene=toTown?MAPS.town:MAPS.forest;await Promise.all([loadZone(z),nextScene?loadImage(nextScene.image):Promise.resolve()]);scene=nextScene;starRender=null;resize();$('zoomControls').hidden=!scene;route=[];pendingPoi=null;
  fields=[];zone=z;s.zone=z;town=toTown;p.mp=maxMP();p.x=0;p.y=0;p.hp=maxHP(s);p.dead=false;p.anim='idle';p.animTime=0;p.action=null;if(scene)Object.assign(p,toWorld(toTown?scene.spawn:(REGIONS[regionId]?.entry||scene.spawn),scene));
  enemies=[];effects=[];projectiles=[];drops=[];target=null;move=null;spawnClock=0;
  if(!town&&!onlineMode)spawn();for(const key of [...images.keys()])if(key.startsWith('maps/')&&key!==scene.image)images.delete(key);travelBusy=false;close();if(onlineMode)net.send({type:'enter',map:town?'town':'forest',gate:regionId});save();toast(town?'เมืองปลอดภัย • แตะป้ายเพื่อเดินไปใช้งาน':scene?.name||ZONES[z].name);return true;
 }catch(e){
  travelBusy=false;
  show(`<h2>เดินทางไม่สำเร็จ</h2><p>โหลดภาพพื้นที่ไม่ได้ ลองอีกครั้งหรือกลับสู่พื้นที่เดิม</p>${button('tryTravel','ลองอีกครั้ง')}${button('backTravel','กลับ')}`);
  $('tryTravel').onclick=()=>travel(z,toTown);$('backTravel').onclick=close;return false;
 }
}
function spawn(){enemies=makePopulation();}
function camera(){let x=.8*((p?.x||0)-(p?.y||0)),y=.4*((p?.x||0)+(p?.y||0));if(scene&&!isStar()){const {width:MAP_W,height:MAP_H}=mapSize(scene);x=Math.max(-MAP_W*.5+screenW/2/scale,Math.min(MAP_W*.5-screenW/2/scale,x));y=Math.max(-MAP_H*.6+screenH*.55/scale,Math.min(MAP_H*.4-screenH*.45/scale,y));}return{x,y};}
function project(x,y){const c=camera();return{x:screenW/2+(.8*(x-y)-c.x)*scale,y:screenH*.55+(.4*(x+y)-c.y)*scale};}
function unproject(x,y){const c=camera(),a=((x-screenW/2)/scale+c.x)/.8,b=((y-screenH*.55)/scale+c.y)/.4;return{x:(a+b)/2,y:(b-a)/2};}
function safeMove(actor,x,y){const old={x:actor.x,y:actor.y};let next=traceStep(scene,old,{x,y});if(Math.hypot(next.x-old.x,next.y-old.y)<.01){const a=traceStep(scene,old,{x,y:old.y}),b=traceStep(scene,old,{x:old.x,y});next=Math.hypot(a.x-old.x,a.y-old.y)>Math.hypot(b.x-old.x,b.y-old.y)?a:b;}Object.assign(actor,next);}
function setDestination(point,poi=null){route=routeTo(scene,p,point);move=route.shift()||null;pendingPoi=poi;target=null;if(!move)toast('ไม่มีทางเดินไปยังจุดนี้');}
function chasePoint(actor,goal){if(!scene)return goal;if(time>=(actor.navAt||0)||!actor.navPath?.length){actor.navPath=routeTo(scene,actor,goal,isStar()?1200:undefined);actor.navAt=time+.6;}while(actor.navPath?.length&&Math.hypot(actor.navPath[0].x-actor.x,actor.navPath[0].y-actor.y)<18)actor.navPath.shift();return actor.navPath?.[0]||actor;}
function usePoi(poi){if(poi.action==='warp')warpMenu();else if(poi.action==='star')travelStar(0);else if(poi.action==='forest')travel(0);else if(poi.action==='town')travel(0,true);else if(poi.action==='waypoint')map();else ({shop,forge,skills:skillMenu}[poi.action])?.();}
function drawSceneMarkers(){if(!scene)return;
 if(scene.tiled){for(let row=0;row<scene.rows;row++)for(let col=0;col<scene.cols;col++){
 const signs=[];if(col<scene.cols-1)signs.push([.86,.48,'ลานล่าถัดไป →']);if(col>0)signs.push([.14,.48,'← ลานล่าถัดไป']);if(row>0)signs.push([.49,.14,'↑ เส้นทางป่า']);if(row<scene.rows-1)signs.push([.49,.85,'↓ เส้นทางป่า']);
 for(const [u,v,label] of signs){const w=toWorld([(col+u)/scene.cols,(row+v)/scene.rows],scene),q=project(w.x,w.y);if(q.x<0||q.x>screenW||q.y<0||q.y>screenH)continue;ctx.save();ctx.font='11px GameThai, sans-serif';ctx.textAlign='center';ctx.fillStyle='#102538d9';ctx.fillRect(q.x-53,q.y-13,106,22);ctx.fillStyle='#efce87';ctx.fillText(label,q.x,q.y+2);ctx.restore();}
 }}for(const poi of scene.pois){const w=poi.world||toWorld(poi.uv,scene),q=project(w.x,w.y),lift=(poi.world?165:44)*scale;if(poi.world&&(q.x<-200||q.x>screenW+200||q.y<-60||q.y>screenH+250))continue;ctx.save();ctx.textAlign='center';ctx.font=`${Math.max(11,13*scale)}px GameThai, sans-serif`;const label=poi.action==='warp'&&s.level<STAR_ZONES[poi.zone].min?poi.name+' • Lv.'+STAR_ZONES[poi.zone].min:poi.name;const width=ctx.measureText(label).width+24;ctx.fillStyle='#193b46dc';ctx.strokeStyle='#ebcd87';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(q.x-width/2,q.y-lift,width,28,7);ctx.fill();ctx.stroke();ctx.fillStyle='#fff0c8';ctx.fillText(label,q.x,q.y-lift+19);ctx.strokeStyle='#f1d48d';ctx.beginPath();ctx.ellipse(q.x,q.y,15*scale,7*scale,0,0,Math.PI*2);ctx.stroke();ctx.restore();}}

function movePlayer(dx,dy,dt,limit=Infinity,strength=1){
 const len=Math.hypot(dx,dy);if(len<.01)return false;
 // Root motion and gait share the same distance, including analog input and world bounds.
 if(actionLocked())return false;
 const speed=baseSpeed()+combatStats(s).speed,step=Math.min(limit,speed*dt*strength),ox=p.x,oy=p.y;
 safeMove(p,p.x+dx/len*step,p.y+dy/len*step);
 const distance=Math.hypot(p.x-ox,p.y-oy);if(distance<.001)return false;
 p.walkDistance=(p.walkDistance||0)+distance;if(Math.abs(dx-dy)>.05)p.face=dx-dy>=0?1:-1;
 p.walkDX=dx/len;p.walkDY=dy/len;p.back=dx+dy<0;p.anim='walk';return true;
}
function floating(x,y,text,color='#fff'){effects.push({type:'text',x,y,text,color,life:1,max:1});}
function hitEnemy(e,amount,quiet=false){if(onlineMode)return;if(e.hp<=0)return;e.aggroUntil=time+5;e.roamGoal=null;e.hp=Math.max(0,e.hp-amount);e.flash=.15;if(!quiet)floating(e.x,e.y,Math.round(amount),'#ffe6a1');if(e.hp===0){e.state='dead';e.clock=1;e.respawn=e.def.boss?25:7;const old=s.level,stone=reward(s,e.def);drops.push({x:e.x,y:e.y,life:1.8,stone});const loot=rollDrop(e.def);if(loot){const kept=addToBag(s,loot);drops.push({x:e.x+18,y:e.y-12,life:2.6,item:RARITY[loot.rarity].color});floating(e.x,e.y-60,(kept?'':'ขายอัตโนมัติ • ')+itemName(loot,s.hero),RARITY[loot.rarity].color);if(loot.rarity>=2)toast(`ได้รับ ${RARITY[loot.rarity].name}: ${itemName(loot,s.hero)}`);}floating(e.x,e.y-30,'+'+e.def.xp+' EXP','#b0f5d1');if(stone)toast('ได้รับทอง');if(s.level>old){for(const learned of knownSkills(s).filter(k=>k.level>old&&k.level<=s.level)){const slot=[0,1,2,3,4].find(i=>!s.equipped[i]);if(slot!==undefined)s.equipped[slot]=learned.id;}p.hp=maxHP(s);toast('เลเวล '+s.level+' • ตรวจทักษะใหม่ที่ศูนย์ฝึก');beep(880,.3)}if(e.def.boss){toast('พิชิต '+e.def.name+' • ได้รับรางวัลบอส');}save();}}
function hurt(amount){if(onlineMode)return;if(p.dead||p.inv>0)return;amount=Math.max(1,amount*100/(100+combatStats(s).defense));p.hp=Math.max(0,p.hp-amount);p.inv=.35;p.action=null;p.animDuration=.26;p.anim='hurt';p.animTime=0;floating(p.x,p.y,Math.round(amount),'#ff9191');beep(150);if(!p.hp){p.dead=true;p.anim='dead';p.animTime=0;move=null;target=null;setTimeout(()=>{if(!p.dead)return;show(`<h2>พลังงานแตกสลาย</h2><p>พักฟื้นที่เมืองแล้วกลับมาฝึกใหม่ได้<br>เลเวลและสิ่งของที่สะสมยังอยู่</p>${button('revive','เกิดที่ฐานฮีโร่')}`);$('revive').onclick=()=>goHome();},800)}}
function actionLocked(){return !!p?.action||(p?.anim==='hurt'&&p.animTime<.26);}
function beginAction(kind,duration,resolve){
 p.anim=kind;p.animTime=0;p.animDuration=duration;p.action={kind,elapsed:0,duration,impactAt:duration*.5,resolved:false,resolve};
}
function advanceAction(dt){
 const a=p?.action;if(!a||p.dead||paused)return;
 a.elapsed+=dt;
 if(!a.resolved&&a.elapsed>=a.impactAt){a.resolved=true;a.resolve();}
 if(p.action===a&&a.elapsed>=a.duration)p.action=null;
}
// Dragonfly is an archer: basic attacks hit from range; everyone else strikes in melee.
// Base walking speed; the open world is large, so heroes move briskly (gear and agility add on top).
function baseSpeed(){return s?.hero?.startsWith('sword')?165:160;}
// Auto mode casts every equipped, ready, affordable skill whose range reaches the target, between basic attacks.
function autoSkill(dist){if(actionLocked())return;for(let i=0;i<5;i++){const r=knownSkills(s).find(r=>r.id===s.equipped[i]&&r.level<=s.level);if(!r||(skillTimers[r.id]||0)>0)continue;const k=compileSkill(r);if(p.mp<k.mp||dist>Math.max(k.range,k.radius)+20)continue;skill(i);return;}}
function lineClear(a,b){const end=traceStep(scene,a,b);return Math.hypot(end.x-b.x,end.y-b.y)<1;}
function attackRange(){return s?.hero==='sword-dragonfly'?340:120;}
function attack(){
 if(onlineMode){onlineAttack();return;}
 if(!p||p.dead||town||cooldown.attack>0||paused||actionLocked())return;
 const live=enemies.filter(e=>e.hp>0),e=target?.hp>0?target:live.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
 if(e&&Math.hypot(e.x-p.x,e.y-p.y)>=attackRange()){target=e;toast('เข้าใกล้ศัตรูเพื่อโจมตี');return;}
 if(e&&!lineClear(p,e))return;
 if(e){p.face=e.x-e.y-p.x+p.y>=0?1:-1;p.back=false;}
 const duration=.46*(1-combatStats(s).haste);cooldown.attack=duration;
 const origin={x:p.x,y:p.y};
 beginAction('attack',duration,()=>{
  if(attackRange()>120&&e)effects.push({type:'technique',hero:s.hero,skillId:'arrow',form:'bolt',x:p.x,y:p.y,aim:{x:e.x,y:e.y},color:'#8ff3ff',radius:20,range:attackRange(),life:.22,max:.22});else effects.push({type:'slash',x:p.x,y:p.y,color:'#a1eaff',life:.22,max:.22});beep(460);
  if(e?.hp>0&&enemies.includes(e)&&lineClear(p,e)&&Math.hypot(e.x-p.x,e.y-p.y)<attackRange()){
   const critical=Math.random()<combatStats(s).crit;hitEnemy(e,damage(s)*(critical?1.5:1));
   const dx=e.x-origin.x,dy=e.y-origin.y,n=Math.hypot(dx,dy)||1;e.recoilX=dx/n*9;e.recoilY=dy/n*9;
   effects.push({type:'impact',x:e.x,y:e.y,color:critical?'#ffe49b':'#b5f7ff',life:.24,max:.24,radius:critical?45:30});beep(critical?190:240,.06);
  }
 });
}
let skillTimers={}, fields=[];
function maxMP(){return combatStats(s).mp;}
function skill(slot=0){
 if(onlineMode){if(p&&!paused&&!p.dead&&net.ready){net.send({type:'skill',slot,target:target?.id});}return;}
 if(!p||p.dead||town||paused||actionLocked())return;
 const r=knownSkills(s).find(r=>r.id===s.equipped[slot]&&r.level<=s.level);if(!r)return;
 const k=compileSkill(r);k.power*=combatStats(s).spell*(1+(s.skillRanks[r.id]||0)*.06);if((skillTimers[r.id]||0)>0)return;
 if(p.mp<k.mp){toast('พลังงานไม่พอ');return;}
 const origin={x:p.x,y:p.y};const nearest=target?.hp>0?target:enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
 let aim=nearest?{x:nearest.x,y:nearest.y}:{x:p.x+p.face*150,y:p.y-p.face*150};const d=Math.hypot(aim.x-p.x,aim.y-p.y);if(d>k.range){aim={x:p.x+(aim.x-p.x)/d*k.range,y:p.y+(aim.y-p.y)/d*k.range};}
 p.mp-=k.mp;skillTimers[r.id]=k.cd;if(nearest)p.face=nearest.x-nearest.y-p.x+p.y>=0?1:-1;p.back=false;
 p.castId=r.id;beginAction('skill',.6,()=>{
 const cast={k,origin,aim,drained:0};
 if(k.form==='field')fields.push({...cast,ticks:4,clock:0});else applyCast(cast);
 if(k.form==='dash'){safeMove(p,aim.x,aim.y);}
 effects.push({type:'technique',hero:s.hero,skillId:k.id,form:k.form,x:origin.x,y:origin.y,aim,color:k.color,radius:k.radius,range:k.range,life:.85,max:.85});beep(600,.15);
 });
}
function applyCast(cast){const {k,origin,aim}=cast;for(const e of skillTargets(k,origin,aim,enemies)){
 const before=e.hp;hitEnemy(e,damage(s)*k.power*(k.element==='lightning'?1.2:1));const dealt=before-e.hp;
 if(k.mods.includes('drain')){const heal=Math.min(dealt*.08,maxHP(s)*.08-cast.drained);cast.drained+=heal;p.hp=Math.min(maxHP(s),p.hp+heal);}
 if(e.hp<=0)continue;const mult=k.mods.includes('lasting')?1.5:1;
 if(k.element==='fire'||k.element==='poison'){e.dots??={};e.dots[k.element]={left:(k.element==='fire'?3:6)*mult,dps:damage(s)*(k.element==='fire'?.15:.1)};}
 if(k.element==='ice')e.slow=3*mult;
 if(k.element==='wind'){const d=Math.hypot(e.x-origin.x,e.y-origin.y)||1;safeMove(e,e.x+(e.x-origin.x)/d*45,e.y+(e.y-origin.y)/d*45);}
}}
function updateSkills(dt){if(onlineMode)return;if(!p||paused||p.dead)return;applyRegen(Object.assign(p,{s}),dt,maxHP(s),maxMP());p.mp=Math.min(maxMP(),(p.mp??maxMP())+dt*manaRegen(s));for(const id in skillTimers)skillTimers[id]=Math.max(0,skillTimers[id]-dt);for(const e of enemies){e.slow=Math.max(0,(e.slow||0)-dt);for(const dot of Object.values(e.dots||{})){if(dot.left>0&&e.hp>0){const t=Math.min(dt,dot.left);dot.left-=t;hitEnemy(e,dot.dps*t,true);}}}for(const f of fields){f.clock-=dt;if(f.clock<=0&&f.ticks>0){applyCast(f);f.ticks--;f.clock+=1;effects.push({type:'technique',hero:s.hero,skillId:f.k.id,form:'field',x:f.aim.x,y:f.aim.y,aim:f.aim,color:f.k.color,radius:f.k.radius,range:f.k.range,life:.8,max:.8});}}fields=fields.filter(f=>f.ticks>0);}

function dash(){if(onlineMode){if(p&&!paused&&net.ready)net.send({type:'dash',x:move?.x??p.x+p.face*150,y:move?.y??p.y-p.face*150});return;}if(!p||p.dead||paused||cooldown.dash>0||actionLocked())return;cooldown.dash=2;let dx=move?move.x-p.x:p.face,dy=move?move.y-p.y:-p.face;const n=Math.hypot(dx,dy)||1;safeMove(p,p.x+dx/n*150,p.y+dy/n*150);p.inv=.6;effects.push({type:'skill',x:p.x,y:p.y,color:'#d5f3df',life:.25,max:.25,radius:60});}
function mpPotion(){if(onlineMode){if(p&&!p.dead&&!paused)net.send({type:'mpPotion'});return;}if(!p||p.dead||paused||(cooldown.mpPotion||0)>0)return;if(!s.mpPotions){toast('ยา MP หมด ซื้อเพิ่มได้ที่ร้าน');return;}if(p.mp>=maxMP())return;s.mpPotions--;p.mp=Math.min(maxMP(),p.mp+maxMP()*.5);cooldown.mpPotion=6;save();}
function potion(){if(onlineMode){if(p&&!paused)net.send({type:'potion'});return;}if(!p||p.dead||paused||cooldown.potion>0)return;if(s.potions<1){toast('ยาหมด ซื้อเพิ่มได้ที่เมือง');return}if(p.hp>=maxHP(s)){toast('พลังชีวิตเต็มแล้ว');return}s.potions--;p.hp=Math.min(maxHP(s),p.hp+maxHP(s)*.5);cooldown.potion=4;floating(p.x,p.y,'ฟื้นฟู','#8fffc2');save();}
function enemyAI(e,dt){e.moving=false;e.flash=Math.max(0,e.flash-dt);e.recoilX=(e.recoilX||0)*Math.exp(-dt*18);e.recoilY=(e.recoilY||0)*Math.exp(-dt*18);e.clock-=dt;if(e.hp<=0)return;const dist=Math.hypot(e.x-p.x,e.y-p.y);if(p.dead)return;if(e.homeX===undefined){e.homeX=e.x;e.homeY=e.y;}if(isStar()&&atHome()&&e.state==='idle'){e.aggroUntil=0;roam(e,dt);return;}if((scene===MAPS.forest||isStar())&&Math.hypot(e.x-e.homeX,e.y-e.homeY)>(isStar()?650:520))e.returning=true;if(e.returning){e.state='idle';e.clock=Math.max(e.clock,1);e.aggroUntil=0;const home={x:e.homeX,y:e.homeY},nav=chasePoint(e,home),d=Math.hypot(nav.x-e.x,nav.y-e.y)||1;safeMove(e,e.x+(nav.x-e.x)/d*e.def.speed*dt,e.y+(nav.y-e.y)/d*e.def.speed*dt);if(Math.hypot(e.x-e.homeX,e.y-e.homeY)<50){e.hp=e.def.hp;e.returning=false;}return;}if(e.state==='idle'&&time>(e.aggroUntil||0)&&dist>(e.def.boss?260:230)){roam(e,dt);return;}const ranged=['projectile','cone','burst'].includes(e.def.attack),range=ranged?230:65;
 if(e.state==='windup'){if(e.clock<=0){e.state='attack';e.clock=.4;const d=e.def.damage;if(e.def.attack==='projectile'){projectiles.push({x:e.x,y:e.y,vx:Math.cos(e.angle)*220,vy:Math.sin(e.angle)*220,life:2.5,damage:d,color:'#f7b65b'});}else if(e.def.attack==='dash'){projectiles.push({x:e.x,y:e.y,vx:Math.cos(e.angle)*330,vy:Math.sin(e.angle)*330,life:.65,damage:d*1.2,color:'#ed7d63',dash:true});}else if(e.def.attack==='burst'){if(Math.hypot(p.x-e.aimX,p.y-e.aimY)<95)hurt(d);effects.push({type:'skill',x:e.aimX,y:e.aimY,color:'#f38c68',life:.4,max:.4,radius:95});}else if(inCone(p.x,p.y,e.x,e.y,e.angle,e.def.attack==='cone'?235:100,e.def.attack==='cone'?1.1:2))hurt(d);}}
 else if(e.state==='attack'){if(e.clock<=0){e.state='idle';e.clock=e.def.cooldown;}}
 else if(dist<range&&e.clock<=0){e.state='windup';e.clock=e.def.boss?1.1:.75;e.angle=Math.atan2(p.y-e.y,p.x-e.x);e.aimX=p.x;e.aimY=p.y;}
 else if(dist<480&&dist>range*.8){const speed=e.def.speed*(e.slow>0?.65:1);const nav=chasePoint(e,p),nd=Math.hypot(nav.x-e.x,nav.y-e.y)||1,step=Math.min(nd,Math.max(0,dist-range*.8),speed*dt),ox=e.x,oy=e.y;safeMove(e,e.x+(nav.x-e.x)/nd*step,e.y+(nav.y-e.y)/nd*step);const screenDX=(e.x-ox)-(e.y-oy);e.moving=Math.hypot(e.x-ox,e.y-oy)>.01;if(Math.abs(screenDX)>.05)e.face=screenDX>=0?1:-1;}
}
function update(dt){time+=dt;if(toastClock>0){toastClock-=dt;if(toastClock<=0)$('toast').style.opacity=0;}if(!p||paused||(onlineMode&&!net.ready))return;updateSkills(dt);p.animTime+=dt;advanceAction(dt);p.inv=Math.max(0,p.inv-dt);Object.keys(cooldown).forEach(k=>cooldown[k]=Math.max(0,cooldown[k]-dt));if(!p.dead){let dx=0,dy=0;if(keys.has('w')||keys.has('arrowup')){dx--;dy--}if(keys.has('s')||keys.has('arrowdown')){dx++;dy++}if(keys.has('a')||keys.has('arrowleft')){dx--;dy++}if(keys.has('d')||keys.has('arrowright')){dx++;dy--}if(stick.id!==null){dx=stick.x+stick.y*2;dy=stick.y*2-stick.x;}let moving=false;if(dx||dy){autoHunt.reset();move=null;target=null;route=[];pendingPoi=null;moving=movePlayer(dx,dy,dt,Infinity,stick.id!==null?Math.min(1,Math.hypot(stick.x,stick.y)):1)}else{if(s.autoAttack&&!town&&!move&&!atHome()){
 const hunt=autoHunt.update(p,enemies,time,actionLocked()?0:dt,attackRange()-30,{route:(a,b)=>routeTo(scene,a,b,isStar()?1600:undefined),clear:lineClear});
 target=hunt?.target||null;
 if(hunt?.ready){autoSkill(Math.hypot(target.x-p.x,target.y-p.y));attack();}
 else if(hunt){const n=hunt.point;moving=movePlayer(n.x-p.x,n.y-p.y,dt,Math.hypot(n.x-p.x,n.y-p.y));}
 }else if(target?.hp>0&&attackHeld){const dist=Math.hypot(target.x-p.x,target.y-p.y),reach=attackRange()-30;if(dist>reach||!lineClear(p,target)){const n=chasePoint(p,target);moving=movePlayer(n.x-p.x,n.y-p.y,dt,Math.hypot(n.x-p.x,n.y-p.y));}else attack();}else if(move){const d=Math.hypot(move.x-p.x,move.y-p.y);if(d>.5)moving=movePlayer(move.x-p.x,move.y-p.y,dt,d);else move=route.shift()||null;}}if(pendingPoi&&!move){const w=pendingPoi.world||toWorld(pendingPoi.uv,scene);if(Math.hypot(p.x-w.x,p.y-w.y)<100){const poi=pendingPoi;pendingPoi=null;usePoi(poi);}}if(!actionLocked()&&(p.animTime>(p.animDuration||.7)||['idle','walk'].includes(p.anim))){p.anim=moving?'walk':'idle';}if(attackHeld||keys.has(' '))attack();if(!onlineMode&&(town||atHome()))p.hp=Math.min(maxHP(s),p.hp+dt*maxHP(s)*.1);}
 if(!town&&!onlineMode){enemies.forEach(e=>{if(e.hp<=0){e.clock-=dt;return;}if(Math.hypot(e.x-p.x,e.y-p.y)>1100){e.moving=false;return;}const x=e.x,y=e.y;enemyAI(e,dt);const moved=Math.hypot(e.x-x,e.y-y);e.moving=moved>.01;e.walkDistance=(e.walkDistance||0)+moved;});if(scene===MAPS.forest)updateRespawns(enemies,p,dt);else if(isStar())starTick(dt);}

 for(const b of projectiles){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(!p.dead&&Math.hypot(b.x-p.x,b.y-p.y)<30){hurt(b.damage);b.life=0;}}projectiles=projectiles.filter(b=>b.life>0);effects.forEach(e=>e.life-=dt);effects=effects.filter(e=>e.life>0);drops.forEach(d=>d.life-=dt);drops=drops.filter(d=>d.life>0);if(onlineMode)net.move(p);saveClock+=dt;if(saveClock>5){saveClock=0;save();}hud();}
function hud(){const auto=$('autoBtn');auto.textContent=(s.autoAttack?'● ':'○ ')+'ออโต้';auto.setAttribute('aria-pressed',String(s.autoAttack));const h=heroIdentity(s.hero);if($('portrait').dataset.hero!==s.hero+JSON.stringify(s.fashion?.equipped)){const pc=document.createElement('canvas');pc.width=96;pc.height=112;drawHero(pc.getContext('2d'),images,s.hero,{face:1,anim:'idle',walkDX:1,walkDY:0,appearance:appearance(s)},48,114,116);$('portrait').style.backgroundImage=`url(${pc.toDataURL()})`;$('portrait').style.backgroundSize='100% 100%';$('portrait').dataset.hero=s.hero+JSON.stringify(s.fashion?.equipped);}$('heroName').textContent=h.name+' +'+s.upgrade;$('level').textContent='Lv. '+s.level;$('hp').style.width=(p.hp/maxHP(s)*100)+'%';$('hpText').textContent='HP • '+Math.ceil(p.hp)+' / '+maxHP(s);$('xp').style.width=(s.xp/xpNeed(s.level)*100)+'%';$('zoneName').textContent=isStar()?starLabel():town?MAPS.town.name:regionAt(p).name+' • Lv.'+regionAt(p).min+'–'+regionAt(p).max;$('money').textContent=s.gold.toLocaleString()+' G • ทอง '+s.stones.toLocaleString();$('potionBtn').textContent=cooldown.potion>0?Math.ceil(cooldown.potion)+'s':'HP '+s.potions;$('mpPotionBtn').textContent=(cooldown.mpPotion||0)>0?Math.ceil(cooldown.mpPotion)+'s':'MP '+s.mpPotions;$('xpText').textContent='EXP • '+s.xp.toLocaleString()+' / '+xpNeed(s.level).toLocaleString();for(let i=0;i<5;i++){const r=knownSkills(s).find(r=>r.id===s.equipped[i]);const b=$(i===0?'skillBtn':'skillBtn'+i);b.disabled=!r;if(b.dataset.skill!==(r?.id||'empty')){b.dataset.skill=r?.id||'empty';b.innerHTML='<span class="skill-art"></span><span class="skill-label"></span><span class="skill-cooldown" hidden></span>';b.querySelector('.skill-label').textContent=r?.name||'ว่าง';b.setAttribute('aria-label',r?.name||'ช่องวิชาว่าง');if(r&&/^[sd](?:[1-9]|10)$/.test(r.id)){const n=Number(r.id.slice(1))-1,art=b.querySelector('.skill-art');art.style.backgroundImage=`url(vfx/${r.id[0]==='s'?'sword':'demon'}.webp)`;art.style.backgroundPosition=`${((n%2)*4+1)/7*100}% ${Math.floor(n/2)/4*100}%`;}}const left=r?(skillTimers[r.id]||0):0,cd=b.querySelector('.skill-cooldown');cd.hidden=left<=0;cd.textContent=left>0?Math.ceil(left)+'s':'';} $('mp').style.width=((p.mp??0)/maxMP()*100)+'%';$('mpText').textContent='MP • '+Math.floor(p.mp??0)+' / '+maxMP();$('dashBtn').textContent=cooldown.dash>0?Math.ceil(cooldown.dash)+'s':'หลบ';}
function realm(l){return l<=15?'ฮีโร่ฝึกหัด':l<=30?'ผู้พิทักษ์ชุมชน':l<=60?'ผู้พิทักษ์เมือง':l<=90?'หัวหน้าหน่วย':l<=120?'ฮีโร่ชั้นนำ':l<=150?'วีรบุรุษ':l<=180?'ผู้พิทักษ์โลก':l<=200?'ตำนานฮีโร่':'สุดยอดฮีโร่';}
const buildings=[{x:-230,y:-140,name:'ร้านเสบียง',kind:'shop'},{x:180,y:-220,name:'ช่างตีอาวุธ',kind:'forge'},{x:330,y:100,name:'ประตูเดินทาง',kind:'map'}];
function poly(points,fill,stroke){ctx.beginPath();points.forEach((v,i)=>{const q=project(v[0],v[1]);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function drawGround(){if(isStar()){starRender.drawGround(ctx,view());return;}ctx.fillStyle='#071421';ctx.fillRect(0,0,screenW,screenH);if(!scene)return;const im=images.get(scene.image);if(!im)return;const {width,height}=mapSize(scene),q=project(0,0),left=q.x-width*.5*scale,top=q.y-height*.6*scale;
 const cols=scene.tiled?scene.cols:1,rows=scene.tiled?scene.rows:1,w=width*scale/cols,h=height*scale/rows;
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const l=left+col*w,t=top+row*h,x=Math.max(0,l),y=Math.max(0,t),right=Math.min(screenW,l+w),bottom=Math.min(screenH,t+h);if(right>x&&bottom>y)ctx.drawImage(im,(x-l)/w*im.width,(y-t)/h*im.height,(right-x)/w*im.width,(bottom-y)/h*im.height,x,y,right-x,bottom-y);}}

function building(b){const q=project(b.x,b.y),u=scale;ctx.save();ctx.translate(q.x,q.y);ctx.scale(u,u);ctx.fillStyle='#142b3640';ctx.beginPath();ctx.ellipse(0,0,90,28,0,0,7);ctx.fill();ctx.fillStyle='#e2cfad';ctx.fillRect(-62,-100,124,95);ctx.fillStyle='#ad9b80';ctx.beginPath();ctx.moveTo(62,-100);ctx.lineTo(95,-80);ctx.lineTo(95,8);ctx.lineTo(62,-5);ctx.fill();ctx.fillStyle='#254c59';ctx.beginPath();ctx.moveTo(-90,-96);ctx.lineTo(-68,-113);ctx.lineTo(0,-154);ctx.lineTo(85,-110);ctx.lineTo(106,-96);ctx.lineTo(74,-91);ctx.lineTo(0,-129);ctx.lineTo(-68,-91);ctx.closePath();ctx.fill();ctx.strokeStyle='#e7c66a';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#456267';ctx.fillRect(-18,-60,36,55);ctx.fillStyle='#d8b060';ctx.fillRect(-49,-65,19,25);ctx.fillRect(30,-65,19,25);ctx.fillStyle='#bc6151';ctx.beginPath();ctx.ellipse(-67,-63,9,15,0,0,7);ctx.fill();ctx.fillStyle='#fff5d2';ctx.font='14px GameThai, sans-serif';ctx.textAlign='center';ctx.fillText(b.name,0,25);ctx.restore();}
function tree(x,y,n){const q=project(x,y),u=scale;ctx.save();ctx.translate(q.x,q.y);ctx.scale(u,u);ctx.fillStyle='#17312b33';ctx.beginPath();ctx.ellipse(0,0,30,10,0,0,7);ctx.fill();ctx.strokeStyle='#507757';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-5,-95);ctx.moveTo(11,0);ctx.lineTo(17,-75);ctx.stroke();ctx.fillStyle=town||zone<2?'#315f52':zone===5?'#e2f2ec':'#355c55';for(let i=0;i<5;i++){ctx.save();ctx.translate((i%2?1:-1)*10,-35-i*12);ctx.rotate((i%2?1:-1)*.6);ctx.beginPath();ctx.ellipse(10,0,28,7,0,0,7);ctx.fill();ctx.restore();}ctx.restore();}
function alienFrame(e){return e.state==='attack'||e.state==='windup'?3:e.moving?1+Math.floor((e.walkDistance||0)/35)%2:0;}
function drawAlien(g,im,e,x,y,size){if(e.def.art==='advanced'){drawAdvancedMonster(g,e,x,y,size,time);return;}g.save();g.translate(x,y);const hover=e.def.slot===2?Math.sin(time*2+e.def.id)*3*scale:0;g.shadowColor='#080a13';g.shadowBlur=3;const bob=e.moving?-Math.abs(Math.sin((e.walkDistance||0)/30))*2*scale:hover;atlas(g,im,e.def.slot,alienFrame(e),3,4,0,bob,size*4/3,size,e.face<0);g.restore();}
function visibleActor(e){const q=project(e.x,e.y);return q.x>-170&&q.x<screenW+170&&q.y>-40&&q.y<screenH+190;}
function actor(e,isHero=false){if(!isHero&&(e.hp<=0&&e.clock<=0||!visibleActor(e)))return;const q=project(e.x+(e.recoilX||0),e.y+(e.recoilY||0)),size=(isHero?110:e.def.boss?165:e.def.elite?130:100)*scale;ctx.save();ctx.globalAlpha=!isHero&&e.hp<=0?Math.max(0,e.clock):1;ctx.fillStyle='#05081799';ctx.beginPath();ctx.ellipse(q.x,q.y-2*scale,size*.27,size*.09,0,0,7);ctx.fill();if(isHero){drawGearAura(ctx,q.x,q.y,size,time,true);if(e.inv>0&&Math.floor(time*20)%2)ctx.globalAlpha=.6;e.appearance=appearance(s);drawHero(ctx,images,s.hero,e,q.x,q.y,size);drawGearAura(ctx,q.x,q.y,size,time,false);}else{if(e.hp>0){ctx.strokeStyle=e===target?'#fff3a4':'#ffb05b';ctx.lineWidth=e===target?3:1.5;ctx.beginPath();ctx.ellipse(q.x,q.y,27*scale,12*scale,0,0,7);ctx.stroke();}if(e.flash>.07)ctx.globalAlpha=.65;drawAlien(ctx,images.get('sprites/alien-forest.webp'),e,q.x,q.y,size);ctx.globalAlpha=1;if(e.hp>0){ctx.font=`bold ${Math.max(10,11*scale)}px GameThai, sans-serif`;ctx.textAlign='center';ctx.fillStyle=e.def.boss?'#ffcf70':e.def.elite?'#ffc4f0':'#fff7d5';ctx.strokeStyle='#080c18';ctx.lineWidth=3;const name=(e.def.boss||e.def.elite||e===target?e.def.name+' ':'')+'Lv.'+e.def.level;ctx.strokeText(name,q.x,q.y-size);ctx.fillText(name,q.x,q.y-size);ctx.fillStyle='#080d1d';ctx.fillRect(q.x-25*scale,q.y-size+4,50*scale,5);ctx.fillStyle=e.def.boss?'#ffb743':'#ff7657';ctx.fillRect(q.x-25*scale,q.y-size+4,50*scale*e.hp/e.def.hp,5);}}ctx.restore();}
function telegraph(e){if(e.state!=='windup'||!visibleActor(e))return;const burst=e.def.attack==='burst',q=project(burst&&!onlineMode?e.aimX:e.x,burst&&!onlineMode?e.aimY:e.y),r=(burst?(onlineMode?150:95):e.def.attack==='cone'?200:e.def.attack==='dash'?160:75)*scale;ctx.save();ctx.strokeStyle='#ffdb9b';ctx.fillStyle='#d73f4544';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(q.x,q.y,r*.9,r*.45,0,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 20px GameThai, sans-serif';ctx.textAlign='center';ctx.fillText('!',q.x,q.y-22);ctx.restore();}
function drawWorld(){drawGround();if(!p)return;if(move){const q=project(move.x,move.y);ctx.strokeStyle='#fff4aa';ctx.beginPath();ctx.ellipse(q.x,q.y,10,5,0,0,7);ctx.stroke();}enemies.forEach(telegraph);const render=[{sort:p.x+p.y,fn:()=>actor(p,true)}];if(onlineMode)for(const remote of net.players)render.push({sort:remote.x+remote.y,fn:()=>drawRemote(remote)});for(const e of enemies)if(visibleActor(e)&&(e.hp>0||e.clock>0))render.push({sort:e.x+e.y,fn:()=>actor(e)});if(town&&!scene)for(const b of buildings)render.push({sort:b.x+b.y,fn:()=>building(b)});for(let i=0;i<(scene?0:22);i++){const a=i*2.399,r=town?560:800,x=Math.cos(a)*r,y=Math.sin(a)*r;render.push({sort:x+y,fn:()=>tree(x,y,i)});}if(isStar()){starRender.props(view(),render,ctx);for(const g of scene.pois){const q=project(g.world.x,g.world.y);if(q.x<-150||q.x>screenW+150||q.y<-40||q.y>screenH+260)continue;render.push({sort:g.world.x+g.world.y-30,fn:()=>drawGate(ctx,q.x,q.y,scale,time,{town:g.action==='town',locked:g.action==='warp'&&s.level<STAR_ZONES[g.zone].min})});}}render.sort((a,b)=>a.sort-b.sort).forEach(o=>o.fn());drawSceneMarkers();for(const b of projectiles){const q=project(b.x,b.y);ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(q.x,q.y-25,7*scale,0,7);ctx.fill();}for(const d of drops){const q=project(d.x,d.y);ctx.fillStyle=d.item||(d.stone?'#ffd34f':'#c5ced8');ctx.beginPath();ctx.ellipse(q.x,q.y-10,6,9,Math.PI/4,0,7);ctx.fill();}for(const e of effects){const q=project(e.x,e.y);ctx.save();ctx.globalAlpha=Math.max(0,e.life/e.max);ctx.fillStyle=e.color;ctx.strokeStyle=e.color;if(e.type==='impact'){const u=1-e.life/e.max;ctx.globalCompositeOperation='lighter';ctx.lineWidth=2.5*scale;for(let i=0;i<8;i++){const a=i*Math.PI/4,r=(e.radius||30)*scale;ctx.beginPath();ctx.moveTo(q.x+Math.cos(a)*r*u*.35,q.y-35*scale+Math.sin(a)*r*u*.35);ctx.lineTo(q.x+Math.cos(a)*r*u,q.y-35*scale+Math.sin(a)*r*u);ctx.stroke();}}else if(e.type==='technique'&&drawSkillArt(e)){/* textured animation */}else if(e.type==='technique'){const a=project(e.aim.x,e.aim.y);ctx.lineWidth=6*scale;ctx.beginPath();if(e.form==='circle'){ctx.ellipse(q.x,q.y,e.radius*scale,e.radius*.5*scale,0,0,7);}else if(e.form==='field'){ctx.ellipse(a.x,a.y,e.radius*scale,e.radius*.5*scale,0,0,7);}else{ctx.moveTo(q.x,q.y-25*scale);ctx.lineTo(a.x,a.y-25*scale);}ctx.stroke();}else if(e.type==='text'){ctx.font='bold 16px GameThai, sans-serif';ctx.textAlign='center';ctx.fillText(e.text,q.x,q.y-60-(1-e.life)*35)}else{const prog=1-e.life/e.max,r=(e.radius||75)*scale*(.3+prog*.7);ctx.lineWidth=e.type==='slash'?6:3;ctx.beginPath();ctx.ellipse(q.x,q.y-25*scale,r,r*.5,-.2,e.type==='slash'?-.9:0,e.type==='slash'?1.6:7);ctx.stroke();if(e.type==='skill')for(let n=0;n<7;n++){const a=n*6.28/7+prog;ctx.beginPath();ctx.moveTo(q.x+Math.cos(a)*r*.3,q.y+Math.sin(a)*r*.15-25);ctx.lineTo(q.x+Math.cos(a)*r,q.y+Math.sin(a)*r*.5-25);ctx.stroke();}}ctx.restore();}}
function loop(t){const dt=Math.min((t-last)/1000||0,.05);last=t;if(!document.hidden){update(dt);draw();}requestAnimationFrame(loop)}
function miniMapBounds(){if(town||!scene||screenW<560)return null;const panel=document.querySelector('.player-panel')?.getBoundingClientRect();const x=(panel?panel.right:270)+10;return {x,y:10,w:isStar()?96:84,h:isStar()?48:56};}
function draw(){drawWorld();const box=miniMapBounds();if(!box)return;if(isStar()){drawStarMini(ctx,box.x,box.y,box.w,box.h,false);return;}
 ctx.save();ctx.fillStyle='#061522d9';ctx.fillRect(box.x-4,box.y-4,box.w+8,box.h+8);
 ctx.fillStyle='#567587';for(const polygon of scene.walk){ctx.beginPath();polygon.forEach(([u,v],i)=>{const x=box.x+u*box.w,y=box.y+v*box.h;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.fill();}
 ctx.font='9px GameThai, sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffe7a0';for(const r of REGIONS)ctx.fillText(r.min+'–'+r.max,box.x+r.center[0]*box.w,box.y+r.center[1]*box.h-8);
 const [u,v]=toUV(p,scene);ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(box.x+u*box.w,box.y+v*box.h,3,0,7);ctx.fill();
 ctx.strokeStyle='#f3cf79';ctx.strokeRect(box.x,box.y,box.w,box.h);ctx.restore();
}


// ---------- ดาวฮีโร่ ----------
function view(){const c=camera();return {scale,ox:screenW/2-c.x*scale,oy:screenH*.55-c.y*scale,w:screenW,h:screenH,camX:c.x,camY:c.y};}
let starArt={};
async function loadStar(){if(star)return star;const r=await fetch('maps/hero-star.json');if(!r.ok)throw new Error('map');const parsed=parseTiled(await r.json());
 // Painted textures/props are optional: a missing manifest or image falls back to procedural art.
 try{const a=await fetch('maps/star/art.json');if(a.ok)starArt=await a.json();}catch{starArt={};}
 star=parsed;starMini=buildMinimap(star,starArt);return star;}
async function loadStarArt(){const files=Object.values(starArt).flatMap(z=>Object.values(z).map(v=>v.file));await Promise.all(files.map(f=>loadImage(f).catch(()=>null)));}
function starLabel(){if(atHome())return 'ฐานฮีโร่ • สถานีออโรรา • เขตปลอดภัย';const Z=STAR_ZONES[zoneAt(scene,p)];return Z?`ดาวฮีโร่ • ${Z.name} • Lv.${Z.min}–${Z.max}`:'ดาวฮีโร่';}
// Home base: the large plaza at gate 1 with shop, upgrade, training and portals. The whole planet is reachable on foot from here.
const HOME_RADIUS=430;
function homeGate(){return star?.pois.find(q=>q.action==='warp'&&q.zone===0)?.world;}
function atHome(){const h=isStar()&&homeGate();return !!h&&Math.hypot(p.x-h.x,p.y-h.y)<HOME_RADIUS;}
function goHome(){autoHunt.reset();return travel(0,true);}
async function travelStar(gate=0,home=false){
 if(travelBusy||!s||!p)return false;
 const Z=STAR_ZONES[gate];if(!Z)return false;if(s.level<Z.min){toast(`ต้องเลเวล ${Z.min} ขึ้นไปจึงวาร์ปไป${Z.name}ได้`);return false;}
 if(!home&&isStar()&&enemies.some(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<400&&time<(e.aggroUntil||0))){toast('ออกจากระยะต่อสู้ก่อนวาร์ป');return false;}
 travelBusy=true;paused=true;bookRequest++;keys.clear();attackHeld=false;
 show(`<h2>กำลังเดินทาง…</h2><p>${home?'กลับฐานฮีโร่':'มุ่งสู่ดาวฮีโร่ • '+Z.name}</p>`);
 try{
  await loadStar();await Promise.all([loadZone(),loadStarArt()]);
  scene=star;starRender=createStarRenderer(star,{quality:s.quality,art:starArt,images});resize();$('zoomControls').hidden=false;route=[];pendingPoi=null;fields=[];town=false;
  p.mp=maxMP();p.hp=maxHP(s);p.dead=false;p.anim='idle';p.animTime=0;p.action=null;const g=star.pois.find(q=>q.action==='warp'&&q.zone===gate);Object.assign(p,{x:g.world.x+40,y:g.world.y+70});
  enemies=[];effects=[];projectiles=[];drops=[];target=null;move=null;spawnClock=0;starZone=zoneAt(star,p);
  starCamps=star.spawns.map(c=>({...c,members:[],respawn:0}));starClock=0;if(!onlineMode)populateStar();starRender.warm(view());
  for(const key of [...images.keys()])if(key.startsWith('maps/')&&!key.startsWith('maps/star/'))images.delete(key);
  travelBusy=false;close();if(onlineMode)net.send({type:'enter',map:'star',gate});save();if(!home)toast(`ดาวฮีโร่ • เขต ${gate+1} ${Z.name} Lv.${Z.min}–${Z.max}`);return true;
 }catch(e){
  travelBusy=false;show(`<h2>เดินทางไม่สำเร็จ</h2><p>โหลดแผนที่ดาวฮีโร่ไม่ได้</p>${button('tryTravel','ลองอีกครั้ง')}${button('backTravel','กลับ')}`);
  $('tryTravel').onclick=()=>travelStar(gate);$('backTravel').onclick=close;return false;
 }
}
// Camps near the hero are simulated; distant ones sleep. Cleared camps respawn after a delay so levelling continues.
const ACTIVE=1500;
function populateStar(){
 enemies=enemies.filter(e=>e.hp>0||e.clock>0);
 for(const c of starCamps){
  c.members=c.members.filter(e=>enemies.includes(e));
  const d=Math.hypot(c.x-p.x,c.y-p.y);
  if(c.members.length&&c.members.every(e=>e.hp<=0)&&!c.respawn)c.respawn=time+(c.elite?40:8+Math.random()*5);
  if(d<ACTIVE&&!c.members.length&&time>=c.respawn&&d>220){
   c.respawn=0;const Z=STAR_ZONES[c.zone];
   for(let k=0;k<c.count;k++){
    const level=k?Math.max(Z.min,Math.min(Z.max,c.level+Math.round(Math.random()*2-1))):c.level;
    const def=starMonster(level,{slot:c.species,elite:c.elite&&!c.boss,boss:c.boss});
    const a=k*2.4+c.id,off=k?48:0;let pos={x:c.x+Math.cos(a)*off,y:c.y+Math.sin(a)*off};if(!walkable(scene,pos))pos={x:c.x,y:c.y};
    const e={def,...pos,hp:def.hp,state:'idle',clock:1+Math.random()*2,angle:0,face:Math.random()<.5?1:-1,flash:0,homeX:pos.x,homeY:pos.y,camp:c};
    c.members.push(e);enemies.push(e);
   }
  }else if(d>ACTIVE+500&&c.members.length&&c.members.every(e=>e.hp>0&&!e.returning&&time>(e.aggroUntil||0))){
   enemies=enemies.filter(e=>!c.members.includes(e));if(c.members.includes(target))target=null;c.members=[];
  }
 }
}
function starTick(dt){
 starClock+=dt;if(starClock>.5){starClock=0;if(!onlineMode)populateStar();}
 const z=zoneAt(scene,p);if(z>=0&&z!==starZone){starZone=z;const Z=STAR_ZONES[z];toast(`เขต ${z+1}: ${Z.name} • Lv.${Z.min}–${Z.max}${s.level<Z.min-2?' • อันตราย!':''}`);}
}
function drawStarMini(g,X,Y,W,H,big){
 if(!starMini||!star)return;g.save();g.fillStyle='#061522d9';if(!big){g.beginPath();g.roundRect(X-4,Y-4,W+8,H+8,8);g.fill();}
 const k=Math.min(W/starMini.width,H/starMini.height),ox=X+(W-starMini.width*k)/2,oy=Y+(H-starMini.height*k)/2;g.drawImage(starMini,ox,oy,starMini.width*k,starMini.height*k);
 const dot=(x,y,r,col)=>{const m=minimapPoint(star,x,y);g.fillStyle=col;g.beginPath();g.arc(ox+m.x*k,oy+m.y*k,r,0,7);g.fill();};
 for(const q of star.pois)dot(q.world.x,q.world.y,big?5:2.5,q.action==='town'?'#ffd77a':s.level>=STAR_ZONES[q.zone].min?'#7fe9ff':'#8a8f9c');
 if(big){g.font='bold 13px GameThai, sans-serif';g.textAlign='center';for(const q of star.pois)if(q.action==='warp'){const m=minimapPoint(star,q.world.x,q.world.y);g.lineWidth=3;g.strokeStyle='#0b1a24';g.strokeText(String(q.zone+1),ox+m.x*k,oy+m.y*k-8);g.fillStyle='#fff3cf';g.fillText(String(q.zone+1),ox+m.x*k,oy+m.y*k-8);}}
 if(isStar()){for(const e of enemies)if(e.hp>0&&e.def.elite)dot(e.x,e.y,big?4:2,'#ff6b8a');dot(p.x,p.y,big?6:3.5,'#ffffff');dot(p.x,p.y,big?3:1.8,'#ff4d4d');}
 if(!big){g.strokeStyle='#f3cf79';g.lineWidth=1;g.beginPath();g.roundRect(X-4,Y-4,W+8,H+8,8);g.stroke();}g.restore();
}
async function warpMenu(){
 if(!s||!p||travelBusy)return;
 show(`<h2>ดาวฮีโร่ • ประตูวาร์ป</h2><p class="sub">โลกเปิด 12 เขต เลเวล 61–120 • ประตูเปิดเมื่อเลเวลถึงขั้นต่ำของเขต • บอสต่างดาวอยู่ในเขต 2, 4, 6, 8, 10, 12</p><canvas id="starMap" class="star-map" width="760" height="380"></canvas><div class="grid warp-grid">${STAR_ZONES.map((Z,i)=>`<button id="warp-${i}" ${s.level>=Z.min?'':'disabled'}>${i+1}. ${Z.name}<br><small>Lv.${Z.min}–${Z.max}${s.level>=Z.min?'':' • ล็อก'}</small></button>`).join('')}</div>${isStar()?button('warpTown','กลับฐานฮีโร่'):''}${button('return','กลับ')}`);
 STAR_ZONES.forEach((Z,i)=>$('warp-'+i).onclick=()=>travelStar(i));$('return').onclick=close;if(isStar())$('warpTown').onclick=()=>goHome();
 try{await loadStar();const c=$('starMap');drawStarMini(c.getContext('2d'),0,0,c.width,c.height,true);}catch{}
}
function menu(){if(!s||!p||travelBusy)return;show(`<h2>ศูนย์บัญชาการฮีโร่</h2><p>${realm(s.level)} • เลเวล ${s.level}<br>ปราบศัตรู ${s.kills} ตัว • พบ ${s.seen.filter(id=>id>=1000).length}/${MONSTERS.length} รายการ</p><div class="hq-menu">${menuTile('stats','ฮีโร่และอุปกรณ์',5)}${menuTile('wardrobe','กระเป๋าแฟชั่น',5)}${menuTile('map','แผนที่ภารกิจ',4)}${menuTile('book','ข้อมูลศัตรู',8)}${menuTile('shop','ร้านเสบียง',2)}${menuTile('forge','อัปเกรดอาวุธ',7)}${menuTile('skills','ทักษะและพลัง',6)}${menuTile('settings','ตั้งค่า',11)}${menuTile('help','คู่มือฮีโร่',8)}${menuTile('resume','กลับเข้าสนาม',0)}</div>`);$('wardrobe').onclick=wardrobe;$('stats').onclick=statMenu;$('map').onclick=map;$('book').onclick=()=>bestiary(zone);$('shop').onclick=()=>town||atHome()?shop():toast('กลับฐานฮีโร่เพื่อซื้อของ');$('forge').onclick=()=>town||atHome()?forge():toast('กลับฐานฮีโร่เพื่อเสริมอาวุธ');$('skills').onclick=skillMenu;$('settings').onclick=settings;$('help').onclick=help;$('resume').onclick=close;}
function map(){show(`<h2>ดาวออโรรา • ป่าชีวะแสง</h2><button id="paintedStar" class="star-entry"><span class="star-preview">✦</span><b>ดาวฮีโร่</b> • โลกเปิด 12 เขต • มอนสเตอร์ใหม่ 20 ชนิด Lv.61–120 • ประตูวาร์ปทุกเขต</button><div class="grid"><button id="paintedTown"><img class="map-preview" src="${MAPS.town.image}" alt="หมู่บ้านฮีโร่">สถานีออโรรา • เขตปลอดภัย</button><button id="paintedForest"><div class="world-overview" aria-label="แผนที่ป่าชีวะแสง">${REGIONS.map(r=>`<span style="left:${r.center[0]*100}%;top:${r.center[1]*100}%">${r.min}–${r.max}</span>`).join('')}${!town?`<i style="left:${toUV(p,MAPS.forest)[0]*100}%;top:${toUV(p,MAPS.forest)[1]*100}%" title="คุณอยู่ที่นี่"></i>`:''}</div>แผนที่ใหญ่ • มอนสเตอร์ Lv.1–60</button></div><p class="sub">พื้นที่ทั้งหมดเชื่อมถึงกัน เดินสำรวจได้ • จุดส่งตัวปลดล็อกตามเลเวล • ใช้จุดส่งตัวเมื่ออยู่ฐานหรือพ้นระยะต่อสู้</p><div class="grid">${REGIONS.map(r=>`<button id="region-${r.id}" ${s.level>=r.min?'':'disabled'}>${r.name}<br><small>Lv.${r.min}–${r.max} • ฝูงมอนสเตอร์และบอส</small></button>`).join('')}</div>${button('return','กลับ')}`);$('paintedStar').onclick=warpMenu;$('paintedTown').onclick=()=>travel(0,true);$('paintedForest').onclick=()=>travel(0);REGIONS.forEach(r=>$('region-'+r.id).onclick=()=>{if(!town&&enemies.some(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<400)){toast('ออกจากระยะต่อสู้ก่อนส่งตัว');return;}travel(0,false,r.id);});$('return').onclick=menu;}
async function bestiary(region=0){const request=++bookRequest;try{await loadZone();if(request!==bookRequest)return;const regions=[...REGIONS,...Array.from({length:6},(_,i)=>({id:6+i,name:'ดาวฮีโร่ • '+STAR_ZONES[i*2].name,min:61+i*10,max:70+i*10}))],r=regions[region]||regions[0],list=MONSTERS.filter(m=>m.region===r.id);show(`<h2>สิ่งมีชีวิตต่างดาว • ${r.name}</h2>${button('starBook',region<6?'มอนสเตอร์ใหม่ 20 ชนิด • Lv.61–120':'ป่าชีวะแสง • Lv.1–60')}<div class="bar">${button('prevBook','‹')}${button('nextBook','›')}<b>Lv.${r.min}–${r.max}</b></div><div class="grid">${list.map(m=>`<div class="card monster-card"><canvas id="m-${m.id}" width="140" height="110"></canvas><b>${m.name}</b><p class="sub">Lv.${m.level} ${m.boss?'• บอส':''}<br>${s.seen.includes(m.id)?'พิชิตแล้ว':'ยังไม่พิชิต'}</p></div>`).join('')}</div>${button('return','กลับ')}`);list.forEach(m=>{const c=$('m-'+m.id);drawAlien(c.getContext('2d'),images.get('sprites/alien-forest.webp'),{def:m,state:'idle',face:1},70,105,100);});$('starBook').onclick=()=>bestiary(region<6?6:0);$('prevBook').onclick=()=>bestiary((region+11)%12);$('nextBook').onclick=()=>bestiary((region+1)%12);$('return').onclick=menu;}catch{toast('โหลดข้อมูลศัตรูไม่ได้');}}
function upgradeItemCards(online=false){return `<p id="adMessage" role="status" aria-live="polite">${escapeHTML(adMessage)}</p><h3>วัตถุดิบอัปเกรด • ซื้อด้วยทอง</h3><div class="grid upgrade-shop">${Object.entries(UPGRADE_ITEMS).map(([id,it])=>`<article class="card upgrade-card"><img src="${it.icon}" alt="${it.name}" width="112" height="112"><h3>${it.name}</h3><p>${it.description}</p><p data-stock="${id}">มี ${s.upgradeItems?.[id]||0} ชิ้น</p><button ${online?'data-op="buyUpgradeItem"':'data-buy-item="true"'} data-id="${id}" ${s.stones<it.price?'disabled':''}>ซื้อ 1 ชิ้น • ${it.price} ทอง</button><button data-reward-item="${id}" ${!ads.supported||!ads.state.ready||adPending||(!ads.state.test&&(!online||!net.adsEnabled))?'disabled':''}>${ads.state.test?'ดูโฆษณาทดสอบ • รับ 1 ชิ้น':'ดูโฆษณา • รับ 1 ชิ้น'}</button></article>`).join('')}</div><p class="sub">เกม 4.16.0 • แอป <span id="adsNativeVersion">${Number.isInteger(ads.state.nativeCode)?ads.state.nativeCode:"—"}</span></p><p class="sub">${ads.supported?(ads.state.test?'โฆษณาทดสอบ • ดูจบรับไอเท็ม 1 ชิ้น • สูงสุด 20 ครั้งต่อ 24 ชั่วโมง':'รับรางวัลในโหมดออนไลน์ เมื่อดูจบและเซิร์ฟเวอร์ยืนยัน • หากไม่มีโฆษณา กรุณาลองใหม่'):'ดูโฆษณาได้ในแอป Android รุ่นที่รองรับ'}</p>`;}
function shopHTML(online=false){return `<h2>ร้านเสบียงฮีโร่</h2><p id="shopBalance">${s.gold.toLocaleString()} G • ทอง ${s.stones.toLocaleString()}</p><p id="purchaseStatus" class="sub" role="status"></p><div class="grid shop-grid"><article class="card"><h3>ยา HP</h3><p id="hpStock">ฟื้น HP 50% • คูลดาวน์ 4 วินาที • มี ${s.potions}</p><button ${online?'data-op="buy"':'id="buy"'} ${s.gold<50?'disabled':''}>ซื้อ • 50 G</button></article><article class="card"><h3>ยา MP</h3><p id="mpStock">ฟื้น MP 50% • คูลดาวน์ 6 วินาที • มี ${s.mpPotions}</p><button ${online?'data-op="buyMP"':'id="buyMP"'} ${s.gold<60?'disabled':''}>ซื้อ • 60 G</button></article></div>${upgradeItemCards(online)}<h3>อุปกรณ์พร้อมใช้ • ระดับหายาก</h3><div class="grid">${ENHANCE_SLOTS.map(slot=>`<article class="card">${slotIcon(slot)}<b>${SLOTS[slot].name} • ${TIERS[tierForLevel(s.level)].name}</b><button data-op="buyShopGear" data-slot="${slot}">ซื้อ • ${gearShopPrice(slot,tierForLevel(s.level))} ทอง</button></article>`).join('')}</div><h3>แลกทองเป็น G</h3><p>1 ทอง = 1,000 G • แลก G กลับเป็นทองไม่ได้</p><button data-op="exchangeGold" data-amount="1">แลก 1 ทอง → 1,000 G</button>`;}
function dailyHTML(online=false){const d=dailyState(s,Date.now()+serverTimeOffset);return `<h3>ภารกิจประจำวัน</h3><div class="grid">${DAILY_TASKS.map(t=>`<article class="card"><b>${t.name}</b><p>${Math.min(t.target,d[t.id]||0)} / ${t.target}</p><small>${t.g.toLocaleString()} G + โลหะ ${t.alloy} ชิ้น</small><button ${online?'data-op="claimActivity"':'data-claim-activity="true"'} data-id="${t.id}" ${d.claimed.includes(t.id)||(d[t.id]||0)<t.target?'disabled':''}>${d.claimed.includes(t.id)?'รับแล้ว':'รับรางวัล'}</button></article>`).join('')}</div>`;}
function settings(){show(`<h2>ตั้งค่า</h2>${button('toggleSound',s.sound?'เสียง: เปิด':'เสียง: ปิด')}${button('toggleQuality',s.quality==='low'?'ภาพ: ประหยัดเครื่อง':'ภาพ: อัตโนมัติ')}${button('privacyButton','ความเป็นส่วนตัว')}${button('settingsBack','กลับ')}`);$('toggleSound').onclick=()=>{s.sound=!s.sound;gameAudio.sync(s.sound);save();settings();};$('toggleQuality').onclick=()=>{s.quality=s.quality==='low'?'auto':'low';resize();save();settings();};$('privacyButton').onclick=privacy;$('settingsBack').onclick=menu;}
function checkinHTML(online=false){const status=checkinStatus(s,Date.now()+(online?serverTimeOffset:0));return `<h2>เช็กอินรับทอง</h2><p>ทองของคุณ ${s.stones.toLocaleString()} • รับได้วันละครั้งตามเวลาไทย</p><div class="checkin-days">${DAILY_GOLD.map((amount,i)=>`<article class="checkin-day ${i+1===status.day?'today':''} ${i+1<status.day||i+1===status.day&&status.claimed?'claimed':''}"><small>วันที่ ${i+1}</small><span class="gold-coin">✦</span><b>${amount} ทอง</b><small>${i+1<status.day||i+1===status.day&&status.claimed?'✓ รับแล้ว':i+1===status.day?'วันนี้':''}</small></article>`).join('')}</div><p class="sub">เช็กอินต่อเนื่องครบ 7 วัน รับรวม 48 ทอง • ขาดวันเริ่มนับใหม่</p><button ${online?'data-op="dailyCheckin"':'id="claimDaily"'} ${status.claimed?'disabled':''}>${status.claimed?'รับทองวันนี้แล้ว':'รับ '+status.reward+' ทอง'}</button>`;}
function checkinMenu(){if(onlineMode)return onlineMenu('checkin');show(checkinHTML()+button('dailyClose','กลับ'));$('claimDaily').onclick=()=>{const amount=claimCheckin(s);if(amount){save();beep(880,.2);toast('ได้รับ '+amount+' ทอง');}checkinMenu();hud();};$('dailyClose').onclick=close;}
function shop(){ads.refresh();if(onlineMode)return onlineMenu('shop');show(shopHTML()+button('return','กลับ'));$('buy').onclick=()=>{buyPotion(s);save();shop();};$('buyMP').onclick=()=>{buyMPPotion(s);save();shop();};document.querySelectorAll('[data-buy-item]').forEach(b=>b.onclick=()=>{if(buyUpgradeItem(s,b.dataset.id)){save();shop();}});bindRewardAds();$('return').onclick=menu;}
function celebrateUpgrade(it,before){show(`<section class="reward-celebration forge-success"><div class="reward-stars">✦ ✧ ✦</div><h2>อัปเกรดสำเร็จ!</h2><div class="forge-prize plus-${Math.min(9,it.plus||0)}">${slotIcon(it.slot)}<b>+${it.plus||0}</b></div><h3>${escapeHTML(itemName(it,s.hero))}</h3><p class="sub">ก่อน: ${escapeHTML(before)}</p><p class="stat-gain">ตอนนี้: ${escapeHTML(statLine(it))}</p><p>บันทึกอุปกรณ์แล้ว</p>${button('forgeContinue','ตีบวกต่อ')}</section>`);$('forgeContinue').onclick=forge;gameAudio.sync(s.sound);gameAudio.success();}
function forgeHTML(online=false){return `<h2>โรงตีอุปกรณ์ • สูงสุด +9</h2><p>${s.gold.toLocaleString()} G • ${s.stones.toLocaleString()} ทอง</p><p class="sub">สำเร็จแน่นอน • ของไม่แตก • ใส่อัญมณีได้ 1 ชนิด ถ้าเปลี่ยนจะคืนเม็ดเดิม</p><div class="forge-grid">${ENHANCE_SLOTS.map(slot=>{const it=s.equip[slot];if(!it)return `<article class="card"><h3>${SLOTS[slot].name}</h3><p>สวมอุปกรณ์จากกระเป๋าก่อน</p></article>`;const plus=it.plus||0, gem=GEM_IDS.find(id=>it.gems?.[id]);return `<article class="card forge-card plus-${plus}"><div class="forge-prize">${slotIcon(slot)}<b>+${plus}</b></div><h3>${escapeHTML(itemName(it,s.hero))}</h3><p>${statLine(it)}</p><button ${online?'data-op="upgradeGear"':'data-forge="true"'} data-slot="${slot}" ${plus>=9||s.stones<gearUpgradeCost(it)||s.gold<gearUpgradeG(it)||s.upgradeItems.alloy<plus+1?'disabled':''}>${plus>=9?'ระดับสูงสุด +9':'ตีบวก +'+(plus+1)+' • '+gearUpgradeCost(it)+' ทอง'}</button>${plus<9?`<small>ใช้โลหะ ${plus+1} ชิ้น (มี ${s.upgradeItems.alloy}) + ${gearUpgradeG(it).toLocaleString()} G</small>`:''}<div class="gem-actions">${GEM_IDS.map(id=>`<button ${online?'data-op="socketGem"':'data-gem="true"'} data-slot="${slot}" data-id="${id}" ${gem===id||!s.upgradeItems[id]?'disabled':''}><img src="${UPGRADE_ITEMS[id].icon}" width="46" height="46" alt="${UPGRADE_ITEMS[id].name}"><span>${gem===id?'✓ ':''}${UPGRADE_ITEMS[id].name}<small>${UPGRADE_ITEMS[id].description} • มี ${s.upgradeItems[id]}</small></span></button>`).join('')}</div><div class="special-box"><img src="items/meteor.webp" width="56" height="56" alt="หินอุกาบาศ"><b>${specialInfo(it.special)?.name||'ยังไม่มีคุณสมบัติพิเศษ'}</b><button ${online?'data-op="rerollSpecial"':'data-reroll="true"'} data-slot="${slot}" ${!s.upgradeItems.meteor?'disabled':''}>สุ่มใหม่ • หินอุกาบาศ 1 (มี ${s.upgradeItems.meteor})</button><small>ฟื้น HP 25%: 5% • MP 10%: 20% • คริ 5%: 20% • โจมตี 30: 25% • ป้องกัน 20: 20% • HP 300: 10%</small>${it.restoreAvailable?`<p>ค่าก่อนสุ่ม: ${specialInfo(it.previousSpecial)?.name||'ไม่มีคุณสมบัติ'}</p><button data-reward-item="restore:${slot}" ${!online||!ads.supported||adPending?'disabled':''}>ดูวิดีโอคืนค่าก่อนสุ่ม</button><small>คืนได้เฉพาะครั้งล่าสุด • ไม่คืนหิน • สุ่มอีกครั้งจะเปลี่ยนค่าที่คืนได้</small>`:''}</div></article>`;}).join('')}</div><p id="adMessage" role="status">${escapeHTML(adMessage)}</p>`;}
function forge(){if(onlineMode)return onlineMenu('forge');show(forgeHTML()+button('return','กลับ'));for(const [selector,fn] of [['[data-forge]',upgradeGear],['[data-gem]',socketGem],['[data-reroll]',rerollSpecial]])document.querySelectorAll(selector).forEach(b=>b.onclick=()=>{const it=s.equip[b.dataset.slot],before=statLine(it);if(fn(s,b.dataset.slot,...(b.dataset.id?[b.dataset.id]:[]))){save();if(fn===rerollSpecial){forge();gameAudio.success();}else celebrateUpgrade(it,before);}else toast('วัสดุหรือเงินไม่พอ');});$('return').onclick=menu;}


function help(){show(`<h2>วิธีเล่น</h2><p>ลากจอยซ้ายหรือแตะพื้นเพื่อเดิน • แตะศัตรูเพื่อล็อกเป้า • กดโจมตีค้างเพื่อเข้าต่อสู้<br>ปุ่มออโต้ เปิด: ค้นหาและโจมตีศัตรูใกล้ตัว • ปิด: ควบคุมการโจมตีเอง<br>ปุ่มโจมตีอยู่ขวาล่าง • วิชา 5 ช่องเรียงรอบปุ่มโจมตี<br>เห็นเครื่องหมาย ! ให้หลบออกจากพื้นที่เตือน<br>ยาฟื้นพลังชีวิต 50% • กลับเมืองเพื่อพักฟื้น ซื้อยา และเสริมอาวุธ<br>ป่าชีวะแสงมี 6 เขต Lv.1–60 • จุดส่งตัวปลดล็อกตามเลเวล<br>คอมพิวเตอร์: WASD / ลูกศรเดิน • Space ฟัน • Q สกิล • E หลบ • R ยา<br>เกมบันทึกในเครื่องอัตโนมัติ การล้างข้อมูลหรือลบแอปทำให้เซฟหาย</p>${button('return','กลับ')}`);$('return').onclick=menu;}
function privacy(){ads.refresh();show(`<h2>ความเป็นส่วนตัว</h2><p>โหมดออฟไลน์เก็บความคืบหน้าในเครื่อง ส่วนโหมดออนไลน์ส่งตำแหน่งในเกมและคำสั่งเล่นไปยังเซิร์ฟเวอร์ของผู้พัฒนา เพื่อเล่นร่วมกันและบันทึกตัวละคร<br>บัญชีออนไลน์ทดสอบผูกกับรหัสสุ่มที่เก็บในเครื่อง ไม่ส่งเซฟออฟไลน์ ไม่เก็บตำแหน่งจริง โฆษณาใช้ Google AdMob ซึ่งอาจประมวลผล IP ข้อมูลอุปกรณ์ ตัวระบุโฆษณา และการใช้งานตามตัวเลือกความเป็นส่วนตัว เมื่อดูโฆษณารับรางวัล ระบบส่งรหัสบัญชีสุ่มและรหัสคำขอให้ Google และเก็บหลักฐานรางวัลเพื่อป้องกันการรับซ้ำ ผู้เล่นอื่นเห็นชื่อฮีโร่และการเคลื่อนไหว<br>อย่าล้างข้อมูลแอปหากยังต้องการเข้าบัญชีออนไลน์เดิม ติดต่อผู้พัฒนาเพื่อขอลบข้อมูลออนไลน์<br>ติดต่อผู้พัฒนา: sunan.tongsan@gmail.com</p><p><a href="https://cockro-network-privacy-policy.vercel.app/">อ่านนโยบายฉบับเต็ม • ไทย / English</a></p>${ads.supported&&ads.state.privacy?button('adPrivacy','จัดการความเป็นส่วนตัวของโฆษณา'):''}${button('return','กลับ')}`);if($('adPrivacy'))$('adPrivacy').onclick=()=>ads.privacy();$('return').onclick=()=>p?settings():title();}
cv.addEventListener('pointerdown',e=>{if(!p||paused||p.dead)return;beep(320,.015);const mini=miniMapBounds();if(mini&&e.clientX>=mini.x&&e.clientX<=mini.x+mini.w&&e.clientY>=mini.y&&e.clientY<=mini.y+mini.h){isStar()?warpMenu():map();return;}const point=unproject(e.clientX,e.clientY);if(scene){for(const poi of scene.pois){const w=poi.world||toWorld(poi.uv,scene),q=project(w.x,w.y);if(Math.abs(e.clientX-q.x)<75&&e.clientY>q.y-(poi.world?185*scale:55)&&e.clientY<q.y+18){setDestination(w,poi);return;}}}if(town&&!scene){for(const b of buildings){const q=project(b.x,b.y);if(Math.abs(e.clientX-q.x)<90*scale&&e.clientY<q.y+30*scale&&e.clientY>q.y-170*scale){({shop,forge,map}[b.kind])();return}}}const found=enemies.filter(x=>x.hp>0).sort((a,b)=>(b.x+b.y)-(a.x+a.y)).find(x=>{const q=project(x.x,x.y);return Math.abs(e.clientX-q.x)<55*scale&&e.clientY<q.y+10&&e.clientY>q.y-130*scale});pendingPoi=null;route=[];target=found||null;if(found){move=null;p.navAt=0;}else setDestination(point);});
const joy=$('joystick');
function moveStick(e){const r=joy.getBoundingClientRect(),radius=r.width*.34,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy),strength=Math.min(1,Math.max(0,(d/radius-.12)/.88));stick.x=d?dx/d*strength:0;stick.y=d?dy/d*strength:0;$('joystickThumb').style.transform=`translate(calc(-50% + ${stick.x*radius}px),calc(-50% + ${stick.y*radius}px))`;}
joy.addEventListener('pointerdown',e=>{if(!p||paused||p.dead||stick.id!==null)return;e.preventDefault();stick.id=e.pointerId;joy.setPointerCapture(e.pointerId);joy.classList.add('active');move=null;target=null;route=[];pendingPoi=null;moveStick(e);});
joy.addEventListener('pointermove',e=>{if(e.pointerId===stick.id)moveStick(e);});
function releaseStick(e){if(e.pointerId!==stick.id)return;stick.id=null;stick.x=stick.y=0;joy.classList.remove('active');$('joystickThumb').style.transform='translate(-50%,-50%)';}
for(const type of ['pointerup','pointercancel','lostpointercapture'])joy.addEventListener(type,releaseStick);
$('autoBtn').onclick=()=>{if(!p||paused||p.dead)return;s.autoAttack=!s.autoAttack;autoHunt.reset();target=null;move=null;route=[];p.navPath=[];save();hud();toast(s.autoAttack?'เปิดโจมตีอัตโนมัติ':'ปิดโจมตีอัตโนมัติ');};
$('statsShortcut').onclick=()=>{if(p&&!travelBusy)statMenu();};
$('attackBtn').addEventListener('pointerdown',e=>{if(!p||paused||p.dead||attackPointer!==null)return;e.preventDefault();attackPointer=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);attackHeld=true;attack();});
function releaseAttack(e){if(e.pointerId===attackPointer){attackHeld=false;attackPointer=null;}}
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('attackBtn').addEventListener(type,releaseAttack);
$('zoomIn').onclick=()=>{mapZoom=Math.min(1.15,mapZoom+.1);resize();};$('zoomOut').onclick=()=>{mapZoom=Math.max(.55,mapZoom-.1);resize();};$('windowClose').onclick=()=>{if(p&&!travelBusy)close();};$('mapShortcut').onclick=map;$('skillsShortcut').onclick=skillMenu;$('bagShortcut').onclick=()=>{if(p&&!travelBusy){sheetSel=null;statMenu('bag');}};
$('skillBtn').onclick=()=>skill(0);$('skillBtn1').onclick=()=>skill(1);$('skillBtn2').onclick=()=>skill(2);$('skillBtn3').onclick=()=>skill(3);$('skillBtn4').onclick=()=>skill(4);$('dashBtn').onclick=dash;$('potionBtn').onclick=potion;$('mpPotionBtn').onclick=mpPotion;$('menuBtn').onclick=menu;$('townBtn').onclick=()=>goHome();
addEventListener('keydown',e=>{if(modal.open||!p)return;const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();keys.add(k);if(k===' ')attack();if(k==='q')skill(0);if(k==='1')skill(0);if(k==='2')skill(1);if(k==='3')skill(2);if(k==='4')skill(3);if(k==='5')skill(4);if(k==='e')dash();if(k==='r')potion();if(k==='t')mpPotion();if(k==='escape')menu();});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{resetControls();save();});document.addEventListener('visibilitychange',()=>{if(document.hidden){resetControls();save();paused=true}else if(!modal.open&&!travelBusy)paused=false;});
window.addEventListener('pagehide',save);
async function boot(){try{await document.fonts.load('16px GameThai');await loadImage('heroes/cockro-combat-v2.webp');await loadZone(0);$('progress').value=9;await loadImage('vfx/sword.webp');$('progress').value=10;await loadImage('vfx/demon.webp');$('progress').value=11;$('loading').hidden=true;title();requestAnimationFrame(loop);}catch(e){$('loadText').textContent='โหลดทรัพยากรไม่สำเร็จ กรุณาลองอีกครั้ง';$('retry').hidden=false;$('retry').onclick=()=>location.reload();console.error(e);}}
boot();

const escapeHTML=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function skillInfo(r){const k=compileSkill(r);k.power*=combatStats(s).spell*(1+(s.skillRanks[r.id]||0)*.06);return `${FORMS[r.form].name} • ${ELEMENTS[r.element].name}<br>${FORMS[r.form].desc}<br>${ELEMENTS[r.element].desc}<br>${r.mods.map(m=>MODS[m].name+': '+MODS[m].desc).join('<br>')}<br>พลัง ×${k.power.toFixed(2)} • พลังงาน ${k.mp} • คูลดาวน์ ${k.cd.toFixed(1)} วินาที`;}
function skillMenu(){if(onlineMode)return onlineMenu('skills');show(`<h2>วิชาของฮีโร่</h2><p>แต้มวิชา ${s.skillPoints} • ติดตั้งได้ 5 วิชา • ปุ่ม Q หรือ 1 / 2 / 3 / 4 / 5</p><div class="grid">${knownSkills(s).map(r=>`<div class="card"><b>${escapeHTML(r.name)}</b><p>ปลดล็อก Lv.${r.level} • ระดับวิชา ${(s.skillRanks[r.id]||0)+1}/20</p><button data-train="${r.id}" ${s.level<r.level||s.skillPoints<1||(s.skillRanks[r.id]||0)>=19?'disabled':''}>ฝึกวิชา • 1 แต้ม</button><p class="sub">${skillInfo(r)}</p>${[0,1,2,3,4].map(i=>`<button data-equip="${r.id}" data-slot="${i}" ${s.level<r.level?'disabled':''}>${s.equipped[i]===r.id?'✓ ':''}ช่อง ${i+1}</button>`).join('')}</div>`).join('')}</div>${button('workshop','ประกอบวิชา • Lv.60 / 120')}${button('materials','ร้านวัตถุดิบ')}${button('return','กลับ')}`);document.querySelectorAll('[data-train]').forEach(b=>b.onclick=()=>{const r=knownSkills(s).find(r=>r.id===b.dataset.train);if(r&&s.level>=r.level&&trainSkill(s,r.id)){save();skillMenu();}});document.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{const id=b.dataset.equip,slot=Number(b.dataset.slot),previous=s.equipped.indexOf(id);if(previous>=0)s.equipped[previous]=null;s.equipped[slot]=id;save();skillMenu();});$('workshop').onclick=workshop;$('materials').onclick=materialShop;$('return').onclick=menu;}
function materialShop(){if(!town){toast('ซื้อวัตถุดิบได้ที่เมือง');return;}const goods={ink:{name:'หมึกคัมภีร์',price:500},core:{name:'แก่นวิชาขั้นสูง',price:5000},...Object.fromEntries(Object.entries(ELEMENTS).map(([id,v])=>[id,{name:'ผลึก'+v.name,price:300}]))};show(`<h2>ร้านวัตถุดิบวิชา</h2><p>${s.gold.toLocaleString()} G</p><div class="grid">${Object.entries(goods).map(([id,v])=>`<button id="buy-${id}" ${id==='core'&&s.level<120?'disabled':''}>${v.name} • ${v.price} G<br>มี ${s.materials[id]} ${id==='core'?'• Lv.120':''}</button>`).join('')}</div>${button('return','กลับ')}`);for(const [id,v]of Object.entries(goods))$('buy-'+id).onclick=()=>{if(s.gold<v.price){toast('เงินไม่พอ');return;}s.gold-=v.price;s.materials[id]++;save();materialShop();};$('return').onclick=skillMenu;}
function workshop(){if(s.level<60){toast('เลเวล 60 ปลดล็อกสร้างวิชาขั้นต้น • 120 ขั้นสูง');return;}if(!town){toast('สร้างวิชาได้ที่เมือง');return;}const opts=o=>Object.entries(o).map(([id,v])=>`<option value="${id}">${v.name}</option>`).join('');show(`<h2>หอคิดค้นวิชา</h2><label>ชื่อวิชา <input id="recipeName" maxlength="32" placeholder="วิชาประจำตัว"></label><label>รูปแบบ <select id="form">${opts(FORMS)}</select></label><label>ธาตุ <select id="element">${opts(ELEMENTS)}</select></label><label>คุณสมบัติ 1 <select id="mod1">${opts(MODS)}</select></label><label>คุณสมบัติ 2 • Lv.120 <select id="mod2" ${s.level<120?'disabled':''}>${opts(MODS)}</select></label><p id="recipePreview"></p><p>ขั้นต้น: 3,000 G + หมึก 1 + ผลึกธาตุที่เลือก 3<br>ขั้นสูง (2 คุณสมบัติ): 12,000 G + หมึก 1 + ผลึก 3 + แก่นขั้นสูง 2</p>${button('craft','ยืนยันสร้าง')}${button('return','กลับ')}`);const recipe=()=>({name:$('recipeName').value,form:$('form').value,element:$('element').value,mods:[$('mod1').value,s.level>=120?$('mod2').value:'none'].filter(m=>m!=='none')});for(const id of ['form','element','mod1','mod2'])$(id).onchange=()=>{$('recipePreview').innerHTML=skillInfo(recipe());};$('form').onchange();$('craft').onclick=()=>{const error=craft(s,recipe());if(error){toast(error);return;}save();toast('สร้างวิชาสำเร็จ เลือกช่องเพื่อติดตั้ง');skillMenu();};$('return').onclick=skillMenu;}

function drawSkillArt(e){
 drawCombatEffect(ctx,e,project,scale,s.quality);
 if(!/^[sd](?:[1-9]|10)$/.test(e.skillId||''))return false;
 const index=e.hero==='sword-cockro'?({s1:0,s2:2,s3:4,s4:1,s5:4,s6:2}[e.skillId]??Number(e.skillId.slice(1))-1):e.hero==='demon-scorpion'?({d1:0,d2:4,d3:3,d4:7,d5:1,d6:9}[e.skillId]??Number(e.skillId.slice(1))-1):e.hero==='sword-dragonfly'?({s1:1,s2:7,s3:5,s4:9,s5:8,s6:2}[e.skillId]??Number(e.skillId.slice(1))-1):e.hero==='sword-cricket'?({s1:0,s2:4,s3:1,s4:5,s5:4,s6:9}[e.skillId]??Number(e.skillId.slice(1))-1):Number(e.skillId.slice(1))-1,im=images.get('vfx/'+(e.skillId[0]==='s'?'sword':'demon')+'.webp');if(!im)return false;
 const progress=Math.min(.999,Math.max(0,1-e.life/e.max)),frame=progress*3,first=Math.floor(frame),mix=frame-first;
 let world={x:e.x,y:e.y};if(e.form==='field')world=e.aim;else if(e.form!=='circle')world={x:e.x+(e.aim.x-e.x)*progress,y:e.y+(e.aim.y-e.y)*progress};
 const q=project(world.x,world.y),size=(e.form==='field'||e.form==='circle'?Math.max(140,e.radius*2):150)*scale;
 if(q.x+size<0||q.x-size>screenW||q.y+size<0||q.y-size>screenH)return true;
 const cw=im.width/8,ch=im.height/5,row=Math.floor(index/2),base=(index%2)*4;
 const render=(f,alpha)=>{if(alpha<=0)return;ctx.globalAlpha=alpha*Math.min(1,e.life/.12);ctx.drawImage(im,(base+f)*cw,row*ch,cw,ch,q.x-size/2,q.y-size*.77,size,size);};
 // Two source frames cross-fade. Low quality draws just one; no runtime blur.
 ctx.save();ctx.globalCompositeOperation='source-over';if(s.quality==='low')render(Math.round(frame),1);else{render(first,1-mix);render(Math.min(3,first+1),mix);}ctx.restore();return true;
}



let inventoryFilter='all',inventorySelected=null,lastInventoryKey='';
function potionIcon(id){const col=id==='hp'?'#f65e72':'#53c9ff';return `<svg viewBox="0 0 80 90" aria-hidden="true"><path d="M30 8h20v22c19 12 23 40 9 49H21C7 70 11 42 30 30z" fill="#183242" stroke="#dce9ed" stroke-width="3"/><path d="M22 49h36c10 18 3 25-3 26H25c-9-3-12-13-3-26" fill="${col}"/><path d="M28 6h24v9H28z" fill="#d8b672"/><path d="M24 45l-4 17" stroke="white" opacity=".7" stroke-width="4"/></svg>`;}
function inventoryArt(entry){if(entry.kind==='gear')return slotIcon(entry.item.slot,RARITY[entry.item.rarity].color);if(entry.kind==='material')return `<img src="${entry.item.icon}" alt="">`;if(entry.kind==='potion')return potionIcon(entry.id);return `<canvas width="180" height="180" data-inventory-fashion="${entry.id}"></canvas>`;}
function onlineInventory(){
 const scroll=$('inventoryGrid')?.scrollTop||0;lastInventoryKey=inventoryKey(s);
 const entries=inventoryEntries(s),visible=entries.filter(e=>inventoryFilter==='all'||e.kind===inventoryFilter),selected=entries.find(e=>e.key===inventorySelected);
 const equipped=Object.entries(s.equip).filter(([,it])=>it);
 let detail='<span class="inventory-hint">แตะไอเท็มเพื่อดูหรือใช้งาน</span>';
 if(selected){const e=selected;const name=e.kind==='gear'?itemName(e.item,s.hero):e.kind==='potion'?(e.id==='hp'?'ยา HP':'ยา MP'):e.item.name;
 detail=`<strong>${escapeHTML(name)}</strong><span>${e.kind==='gear'?statLine(e.item):e.kind==='material'?e.item.description:e.kind==='potion'?'ฟื้นพลัง 50%':'แฟชั่น • สวมใส่ได้ทุกอาชีพ'}</span>`;
 if(e.kind==='gear')detail+=`<button id="inventoryEquip" ${canEquip(s,e.item)?'':'disabled'}>สวมใส่</button><button id="inventorySell">ขาย ${sellPrice(e.item)} G</button>`;
 if(e.kind==='material')detail+='<button id="inventoryForge">อัปเกรดอุปกรณ์</button>';
 if(e.kind==='fashion')detail+='<button id="inventoryWear">สวมใส่</button>';
 }
 show(`<h2>กระเป๋า</h2><div class="inventory-layout"><section class="inventory-hero"><canvas id="inventoryPortrait" width="260" height="240"></canvas><div class="inventory-equipped">${SLOT_ORDER.map(slot=>{const it=s.equip[slot];return `<button data-inventory-equipped="${slot}" title="${SLOTS[slot].name}" aria-label="${SLOTS[slot].name}" class="inventory-cell plus-${it?.plus||0} ${it?'':'empty'}">${slotIcon(slot,it?RARITY[it.rarity].color:'#52606b')}${it?.plus?`<b>+${it.plus}</b>`:''}</button>`;}).join('')}</div><button id="inventoryAttributes">ค่าสถานะ</button></section><section class="inventory-content"><nav class="inventory-tabs">${[['all','▦','ทั้งหมด'],['gear','⚔','อุปกรณ์'],['material','◆','วัตถุดิบ'],['potion','♥','ยา'],['fashion','♜','แฟชั่น']].map(([id,icon,label])=>`<button data-inventory-filter="${id}" aria-label="${label}" title="${label}" class="${inventoryFilter===id?'selected':''}">${icon}</button>`).join('')}</nav><div id="inventoryGrid" class="inventory-grid">${visible.map(e=>`<button class="inventory-cell plus-${e.kind==='gear'?e.item.plus||0:0} ${e.key===inventorySelected?'selected':''}" data-inventory-key="${escapeHTML(e.key)}" aria-label="${escapeHTML(e.kind==='gear'?itemName(e.item,s.hero):e.item?.name||e.id)}" style="--item-color:${e.kind==='gear'?RARITY[e.item.rarity].color:'#c8a65b'}">${inventoryArt(e)}<b>${e.count}</b>${e.kind==='gear'&&e.item.plus?`<i>+${e.item.plus}</i>`:''}</button>`).join('')}${Array.from({length:Math.max(0,24-visible.length)},()=>'<span class="inventory-cell empty"></span>').join('')}</div><div class="inventory-detail">${detail}</div><div class="inventory-wallet">◉ ${s.gold.toLocaleString()} G <span>✦ ${s.stones.toLocaleString()}</span></div></section></div>`);
 onlineView='stats';$('inventoryGrid').scrollTop=scroll;
 const portrait=$('inventoryPortrait'),g=portrait.getContext('2d');drawHero(g,images,s.hero,{...p,anim:'idle',animTime:0},130,225,205);
 document.querySelectorAll('[data-inventory-fashion]').forEach(c=>drawFashionIcon(c.getContext('2d'),images,c.dataset.inventoryFashion,8,8,164));
 document.querySelectorAll('[data-inventory-filter]').forEach(b=>b.onclick=()=>{inventoryFilter=b.dataset.inventoryFilter;inventorySelected=null;onlineInventory();});
 document.querySelectorAll('[data-inventory-key]').forEach(b=>b.onclick=()=>{inventorySelected=b.dataset.inventoryKey;onlineInventory();});
 document.querySelectorAll('[data-inventory-equipped]').forEach(b=>b.onclick=()=>{const it=s.equip[b.dataset.inventoryEquipped];if(!it)return;inventorySelected=null;const panel=document.querySelector('.inventory-detail');panel.innerHTML=`<strong>${escapeHTML(itemName(it,s.hero))}</strong><span>${statLine(it)}</span><button id="inventoryRemove">ถอดออก</button>`;$('inventoryRemove').onclick=()=>net.send({type:'op',op:'unequip',slot:b.dataset.inventoryEquipped});});
 $('inventoryAttributes').onclick=()=>onlineMenu('attributes');
 if(selected?.kind==='gear'){$('inventoryEquip').onclick=()=>net.send({type:'op',op:'equip',id:selected.item.id});$('inventorySell').onclick=()=>net.send({type:'op',op:'sell',id:selected.item.id});}
 if(selected?.kind==='material')$('inventoryForge').onclick=forge;
 if(selected?.kind==='fashion')$('inventoryWear').onclick=()=>net.send({type:'op',op:'fashionWear',id:selected.id});
}

// ---------- Hero sheet: paper doll with equipment, attributes and bag ----------
const SLOT_ICON={weapon:'M5 19l9-9m0 0l3-6 3 3-6 3zM4 20l2-2m1 3l-3-3',helm:'M5 14a7 7 0 0114 0v3H5zM9 17v3m6-3v3M12 7V4',armor:'M7 4l5 3 5-3 3 4-3 3v9H7v-9L4 8z',gloves:'M7 21v-8l-2-4 2-1 2 3V5h2v6V4h2v7V5h2v7l2-3 2 1-3 6v5z',boots:'M8 3h5v10l6 3v4H6v-4l2-2z',wings:'M12 12C9 6 5 4 2 4c1 5 4 8 10 8zm0 0c3-6 7-8 10-8-1 5-4 8-10 8zm0 0v8',ring:'M12 21a6 6 0 100-12 6 6 0 000 12zM9 5l3-2 3 2-3 3z',amulet:'M6 3c0 6 3 9 6 9s6-3 6-9M12 12v2m0 0l-3 4 3 3 3-3z'};
function slotIcon(slot,color='#d9b25c'){if(ENHANCE_SLOTS.includes(slot))return `<span class="equipment-art equipment-${slot}" role="img" aria-label="${SLOTS[slot].name}"></span>`;return `<svg viewBox="0 0 24 24" class="slot-svg" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="${SLOT_ICON[slot]}"/></svg>`;}
function statLine(it){const st=itemStats(it),L={atk:'โจมตี',def:'ป้องกัน',hp:'HP',crit:'คริติคอล',speed:'ความเร็ว',mp:'พลังงาน',spell:'พลังวิชา'};return Object.entries(st).map(([k,v])=>`${L[k]} +${k==='crit'||k==='spell'?(v*100).toFixed(1)+'%':v}`).join(' • ')+(specialInfo(it.special)?' • '+specialInfo(it.special).name:'');}
function basePower(){const c=combatStats(s);return damage(s)*3+maxHP(s)*.4+c.defense*6+c.crit*900+(c.spell-1)*600;}
// Wings and a legendary aura make equipment visible on the hero in the world and in the sheet.
function drawGearAura(g,x,y,size,t,back){if(!back)drawEnhanceAura(g,x,y,size,t,auraLevel(s));
 const w=s?.equip?.wings,wep=s?.equip?.weapon;
 if(back&&w){const col=RARITY[w.rarity].color,span=size*(.55+w.tier*.05),flap=Math.sin(t*3)*.12;g.save();g.translate(x,y-size*.62);g.globalCompositeOperation='lighter';
  for(const side of [-1,1]){g.save();g.scale(side,1);g.rotate(-.25+flap);const gr=g.createLinearGradient(0,0,span,-span*.5);gr.addColorStop(0,col+'cc');gr.addColorStop(1,col+'00');g.fillStyle=gr;
   for(let k=0;k<3;k++){g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(span*.5,-span*(.55-k*.12),span*(1-k*.15),-span*(.25-k*.2));g.quadraticCurveTo(span*.45,-span*(.05-k*.1),0,size*.04*k);g.fill();}g.restore();}
  g.restore();}
 if(!back&&wep&&wep.rarity>=2){const col=RARITY[wep.rarity].color;g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.35+Math.sin(t*4)*.15;g.strokeStyle=col;g.lineWidth=2;g.beginPath();g.ellipse(x,y,size*.34,size*.11,0,0,7);g.stroke();
  for(let k=0;k<5;k++){const a=t*1.5+k*1.26,r=size*.3;g.fillStyle=col;g.beginPath();g.arc(x+Math.cos(a)*r,y-size*.2-((t*40+k*30)%(size*.7)),2,0,7);g.fill();}g.restore();}
}
let sheetTab='stats',sheetSel=null,sheetPose=0,sheetAnim=0;
const POSES=[{anim:'idle'},{anim:'walk'},{anim:'attack'},{anim:'skill'}];
function statMenu(tab=sheetTab){if(onlineMode)return onlineInventory();sheetTab=tab;
 const c=combatStats(s),power=heroPower(s,basePower());
 const slotHtml=k=>{const it=s.equip[k];return `<button class="gear-slot ${sheetSel?.where==='equip'&&sheetSel.slot===k?'sel':''}" data-eq="${k}" style="--rc:${it?RARITY[it.rarity].color:'#5b4224'}" title="${SLOTS[k].name}">${slotIcon(k,it?RARITY[it.rarity].color:'#6b5434')}${it?`<i>${TIERS[it.tier].name}</i>`:`<i>${SLOTS[k].name}</i>`}</button>`;};
 const left=SLOT_ORDER.slice(0,4).map(slotHtml).join(''),right=SLOT_ORDER.slice(4).map(slotHtml).join('');
 const names={str:['กำลัง','โจมตี +2'],vit:['กายา','HP +12 • ป้องกัน +0.6'],agi:['ว่องไว','คริติคอล • ความเร็ว'],int:['จิตวิญญาณ','พลังงาน +8 • พลังวิชา +0.8%']};
 const statsTab=`<div class="attr-list">${Object.entries(names).map(([k,[n,d]])=>`<div class="attr"><span><b>${n}</b><small>${d}</small></span><em>${s.attributes[k]}</em><button data-stat="${k}" ${s.statPoints<1?'disabled':''} aria-label="เพิ่ม${n}">＋</button></div>`).join('')}</div>
  <div class="derived"><span>โจมตี<b>${damage(s)}</b></span><span>ป้องกัน<b>${c.defense.toFixed(1)}</b></span><span>HP<b>${maxHP(s)}</b></span><span>พลังงาน<b>${c.mp}</b></span><span>คริติคอล<b>${(c.crit*100).toFixed(1)}%</b></span><span>พลังวิชา<b>×${c.spell.toFixed(2)}</b></span><span>ความเร็ว<b>${(baseSpeed()+c.speed).toFixed(0)}</b></span><span>ชื่อเสียง<b>${s.reputation}</b></span></div>`;
 const bagTab=`<div class="bag-grid">${Array.from({length:BAG_SIZE},(_,i)=>{const it=s.bag[i];return it?`<button class="bag-cell ${sheetSel?.id===it.id?'sel':''} ${canEquip(s,it)?'':'locked'}" data-item="${it.id}" style="--rc:${RARITY[it.rarity].color}" title="${itemName(it,s.hero)}">${slotIcon(it.slot,RARITY[it.rarity].color)}<i>${it.tier+1}</i></button>`:'<span class="bag-cell empty"></span>';}).join('')}</div><p class="sub">${s.bag.length}/${BAG_SIZE} ชิ้น • มอนสเตอร์ หัวหน้า และบอสมีโอกาสดรอปอุปกรณ์ • กระเป๋าเต็มจะขายอัตโนมัติ</p>`;
 let detail='';const sel=sheetSel&&(sheetSel.where==='equip'?s.equip[sheetSel.slot]:s.bag.find(x=>x.id===sheetSel.id));
 if(sel){const worn=s.equip[sel.slot],diff=sheetSel.where==='bag'?itemPower(sel)-(worn?itemPower(worn):0):0;
  detail=`<div class="item-card" style="--rc:${RARITY[sel.rarity].color}"><div class="item-head">${slotIcon(sel.slot,RARITY[sel.rarity].color)}<div><b>${itemName(sel,s.hero)}</b><small>${RARITY[sel.rarity].name} • ${SLOTS[sel.slot].name} • ต้องการ Lv.${TIERS[sel.tier].level}</small></div></div><p>${statLine(sel)}</p>${sheetSel.where==='bag'?`<p class="cmp ${diff>=0?'up':'down'}">พลังรบ ${diff>=0?'▲ +':'▼ '}${diff} เมื่อเทียบกับที่สวมอยู่</p>`:''}<div class="item-actions">${sheetSel.where==='bag'?`${button('doEquip','สวมใส่')}${button('doSell','ขาย • '+sellPrice(sel).toLocaleString()+' G')}`:button('doUnequip','ถอดออก')}</div></div>`;}
 show(`<h2>ฮีโร่ของฉัน</h2><div class="hero-sheet">
  <section class="doll"><div class="doll-head"><b>${heroIdentity(s.hero).name}</b><span>Lv.${s.level} • ${realm(s.level)}</span></div>
   <div class="doll-body"><div class="slots">${left}</div><div class="stage"><canvas id="dollCanvas" width="360" height="420"></canvas><div class="power"><small>พลังรบ</small><b>${power.toLocaleString()}</b></div><button id="poseBtn" class="pose">⟳ ท่า</button></div><div class="slots">${right}</div></div></section>
  <section class="sheet-side"><nav class="tabs">${button('tabStats','ค่าสถานะ • แต้ม '+s.statPoints)}${button('tabBag','กระเป๋า • '+s.bag.length)}${button('fashionBag','แฟชั่น')}</nav>${detail}${sheetTab==='bag'?bagTab:statsTab}</section></div>`);
 $('fashionBag').onclick=wardrobe;$('tabStats').classList.toggle('on',sheetTab==='stats');$('tabBag').classList.toggle('on',sheetTab==='bag');
 $('tabStats').onclick=()=>{sheetSel=null;statMenu('stats');};$('tabBag').onclick=()=>{sheetSel=null;statMenu('bag');};
 document.querySelectorAll('[data-stat]').forEach(b=>b.onclick=()=>{if(allocateStat(s,b.dataset.stat)){save();statMenu();hud();}});
 document.querySelectorAll('[data-eq]').forEach(b=>b.onclick=()=>{sheetSel=s.equip[b.dataset.eq]?{where:'equip',slot:b.dataset.eq}:null;if(!sheetSel){statMenu('bag');toast('เลือกอุปกรณ์ช่อง'+SLOTS[b.dataset.eq].name+'จากกระเป๋า');return;}statMenu();});
 document.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>{sheetSel={where:'bag',id:b.dataset.item};statMenu();});
 if($('doEquip'))$('doEquip').onclick=()=>{const err=equip(s,sheetSel.id);if(err){toast(err);return;}beep(700,.12);sheetSel=null;save();statMenu();hud();};
 if($('doSell'))$('doSell').onclick=()=>{const g=sell(s,sheetSel.id);toast('ขายได้ '+g.toLocaleString()+' G');sheetSel=null;save();statMenu();hud();};
 if($('doUnequip'))$('doUnequip').onclick=()=>{const err=unequip(s,sheetSel.slot);if(err){toast(err);return;}sheetSel=null;save();statMenu();hud();};
 $('poseBtn').onclick=()=>{sheetPose=(sheetPose+1)%POSES.length;sheetAnim=0;};
 const cv=$('dollCanvas'),g=cv.getContext('2d'),request=bookRequest;let last=performance.now(),walk=0;
 const frame=now=>{if(request!==bookRequest||!modal.open||!cv.isConnected)return;const dt=Math.min(.05,(now-last)/1000);last=now;sheetAnim+=dt;walk+=dt*60;
  g.clearRect(0,0,cv.width,cv.height);const cx=cv.width/2,fy=cv.height-46,t=now/1000;
  const fl=g.createRadialGradient(cx,fy,10,cx,fy,170);fl.addColorStop(0,'#ffcf6a55');fl.addColorStop(1,'#ffcf6a00');g.fillStyle=fl;g.fillRect(0,0,cv.width,cv.height);
  g.save();g.strokeStyle='#d9b25caa';g.lineWidth=2;g.beginPath();g.ellipse(cx,fy,120,30,0,0,7);g.stroke();g.strokeStyle='#d9b25c44';g.beginPath();g.ellipse(cx,fy,150,40,0,0,7);g.stroke();
  g.setLineDash([6,10]);g.lineDashOffset=-t*20;g.strokeStyle='#ffcf6a88';g.beginPath();g.ellipse(cx,fy,135,35,0,0,7);g.stroke();g.restore();
  const pose=POSES[sheetPose],dur=.7,actor={face:1,anim:pose.anim,animTime:pose.anim==='idle'||pose.anim==='walk'?sheetAnim:sheetAnim%dur,animDuration:dur,walkDistance:walk,walkDX:1,walkDY:0,castId:s.equipped[0]};
  drawGearAura(g,cx,fy,300,t,true);drawHero(g,images,s.hero,{...actor,appearance:appearance(s)},cx,fy,300);drawGearAura(g,cx,fy,300,t,false);
  requestAnimationFrame(frame);};
 requestAnimationFrame(frame);
 $('windowClose').hidden=false;
}

function roam(e,dt){
 e.roamClock=(e.roamClock??(1+e.def.id%4))-dt;
 if(e.roamGoal){const dx=e.roamGoal.x-e.x,dy=e.roamGoal.y-e.y,d=Math.hypot(dx,dy);if(d<5||e.roamClock<0){e.roamGoal=null;e.roamClock=1.5+Math.random()*3;return;}const step=Math.min(d,e.def.speed*.28*dt),x=e.x,y=e.y;safeMove(e,e.x+dx/d*step,e.y+dy/d*step);e.moving=Math.hypot(e.x-x,e.y-y)>.01;if(Math.abs((e.x-x)-(e.y-y))>.05)e.face=dx-dy>=0?1:-1;return;}
 if(e.roamClock<=0){const angle=Math.random()*Math.PI*2,r=25+Math.random()*55;e.roamGoal=traceStep(scene,e,{x:e.homeX+Math.cos(angle)*r,y:e.homeY+Math.sin(angle)*r});e.roamClock=4;}
}





let fashionSelection=null,fashionPose='idle',fashionBack=false,fashionHero=null;
async function loadFashionAssets(){await Promise.all(FASHION_SETS.map(set=>loadImage(set.file).catch(()=>null)));}
async function wardrobe(){
 if(!s||!p)return;normalizeFashion(s);fashionHero=s.hero;
 show('<h2>กำลังเปิดกระเป๋าแฟชั่น…</h2>');await loadFashionAssets();
 const request=++bookRequest;onlineView='wardrobe';
 const item=FASHION_ITEMS.find(it=>it.id===fashionSelection)||FASHION_ITEMS[0];fashionSelection=item.id;
 $('modalContent').innerHTML=`<div class="fashion-title"><div><small>COCKRO ATELIER</small><h2>กระเป๋าแฟชั่น</h2><p>สวมได้ทุกอาชีพ • หมวกและชุดผสมกันได้ • ค่าพลังเดิมคงอยู่</p></div><span class="fashion-count">${s.fashion.owned.length} / ${FASHION_ITEMS.length} ชิ้น</span></div><div class="wardrobe-layout"><section class="fashion-stage"><div class="fashion-stage-top"><b id="fashionHeroName">${heroIdentity(s.hero).name}</b><span>ตัวอย่างชุด</span></div><canvas id="fashionPreview" width="520" height="580" aria-label="ตัวอย่างตัวละครสวมแฟชั่น"></canvas><div class="fashion-controls"><button id="fashionTurn">↻ ด้านหลัง</button><button id="fashionPose">▶ เดิน</button><button id="fashionReset">ลุคที่สวมอยู่</button></div><label class="fashion-hero-label">ลองกับอาชีพ <select id="fashionHero">${HERO_CLASSES.filter(h=>h.playable).map(h=>`<option value="${h.id}" ${h.id===s.hero?'selected':''}>${h.name}</option>`).join('')}</select></label><p class="sub">การลองอาชีพในหน้าต่างนี้ไม่เปลี่ยนอาชีพจริง</p></section><section class="fashion-bag"><div class="fashion-equipped"><span id="fashionHatStatus"></span><span id="fashionOutfitStatus"></span></div><div class="fashion-grid">${FASHION_ITEMS.map(it=>`<button class="fashion-cell" data-fashion="${it.id}" style="--fashion-color:${it.color}" aria-label="ลอง ${it.name}"><canvas width="180" height="180" data-fashion-icon="${it.id}"></canvas><span>${it.name}</span><small>${it.slot==='hat'?'หมวก':'ชุด'} • ทุกอาชีพ</small><b data-fashion-mark="${it.id}"></b></button>`).join('')}</div><article class="fashion-detail"><h3 id="fashionItemName"></h3><p id="fashionItemDescription"></p><div class="fashion-actions"><button id="fashionWear">สวมใส่</button><button id="fashionRemoveHat">ถอดหมวก</button><button id="fashionRemoveOutfit">ถอดชุด</button></div><p id="fashionMessage" aria-live="polite"></p></article></section></div>${button('fashionReturn','กลับ')}`;
 document.querySelectorAll('[data-fashion-icon]').forEach(c=>drawFashionIcon(c.getContext('2d'),images,c.dataset.fashionIcon,8,8,164));
 document.querySelectorAll('[data-fashion]').forEach(b=>b.onclick=()=>{fashionSelection=b.dataset.fashion;updateWardrobe();});
 $('fashionReturn').onclick=menu;
 $('fashionWear').onclick=()=>{if(!fashionSelection)return;if(onlineMode){if(!net.ready){toast('รอเชื่อมต่อเซิร์ฟเวอร์');return;}net.send({type:'op',op:'fashionWear',id:fashionSelection});$('fashionMessage').textContent='กำลังบันทึกชุดบนเซิร์ฟเวอร์…';}else{wearFashion(s,fashionSelection);save();updateWardrobe();}};
 const remove=slot=>{if(onlineMode){if(net.ready)net.send({type:'op',op:'fashionRemove',slot});}else{removeFashion(s,slot);save();updateWardrobe();}fashionSelection=null;};
 $('fashionRemoveHat').onclick=()=>remove('hat');$('fashionRemoveOutfit').onclick=()=>remove('outfit');
 $('fashionReset').onclick=()=>{fashionSelection=null;updateWardrobe();};
 $('fashionTurn').onclick=()=>{fashionBack=!fashionBack;$('fashionTurn').textContent=fashionBack?'↻ ด้านหน้า':'↻ ด้านหลัง';};
 $('fashionPose').onclick=()=>{fashionPose=fashionPose==='idle'?'walk':fashionPose==='walk'?'attack':'idle';$('fashionPose').textContent={idle:'▶ เดิน',walk:'⚔ โจมตี',attack:'■ ยืน'}[fashionPose];};
 $('fashionHero').onchange=async()=>{const hero=$('fashionHero').value;await loadImage(hero==='sword-cockro'?'heroes/cockro-combat-v2.webp':`heroes/${hero}.webp`);if(request!==bookRequest)return;fashionHero=hero;$('fashionHeroName').textContent=heroIdentity(hero).name;};
 updateWardrobe();const c=$('fashionPreview'),g=c.getContext('2d');let start=performance.now();
 const frame=now=>{if(request!==bookRequest||!modal.open||!c.isConnected)return;const t=(now-start)/1000;g.clearRect(0,0,c.width,c.height);const gl=g.createRadialGradient(260,420,20,260,420,220);gl.addColorStop(0,'#f4cf7940');gl.addColorStop(1,'#0a192700');g.fillStyle=gl;g.fillRect(0,0,c.width,c.height);g.fillStyle='#07131d99';g.beginPath();g.ellipse(260,510,112,25,0,0,7);g.fill();g.strokeStyle='#bda66d99';g.lineWidth=2;g.beginPath();g.ellipse(260,510,138,34,0,0,7);g.stroke();let look=appearance(s);const it=FASHION_ITEMS.find(i=>i.id===fashionSelection);if(it)look[it.slot]=it.id;const anim=fashionBack?'walk':fashionPose;drawHero(g,images,fashionHero||s.hero,{face:1,anim,animTime:t%.8,animDuration:.8,walkDistance:fashionPose==='idle'?0:t*75,back:fashionBack,appearance:look},260,504,360);requestAnimationFrame(frame);};requestAnimationFrame(frame);
}
function updateWardrobe(){
 if(!$('fashionItemName'))return;onlinePaint=performance.now();const selected=FASHION_ITEMS.find(it=>it.id===fashionSelection),look=appearance(s);
 for(const slot of ['hat','outfit']){const it=FASHION_ITEMS.find(i=>i.id===look[slot]);$(slot==='hat'?'fashionHatStatus':'fashionOutfitStatus').textContent=(slot==='hat'?'หมวก: ':'ชุด: ')+(it?.name||'ลุคเดิม');}
 document.querySelectorAll('[data-fashion]').forEach(b=>{b.classList.toggle('selected',b.dataset.fashion===fashionSelection);b.setAttribute('aria-pressed',String(b.dataset.fashion===fashionSelection));});
 document.querySelectorAll('[data-fashion-mark]').forEach(b=>{b.textContent=Object.values(look).includes(b.dataset.fashionMark)?'✓ สวมอยู่':'';});
 $('fashionItemName').textContent=selected?.name||'ลุคที่สวมอยู่';$('fashionItemDescription').textContent=selected?'ภาพด้านหน้าและด้านหลัง • ใช้ได้ทั้ง 4 อาชีพ':'เลือกไอเท็มในกระเป๋าเพื่อลองสวม';
 const equipped=selected&&look[selected.slot]===selected.id;$('fashionWear').disabled=!selected||equipped;$('fashionWear').textContent=equipped?'✓ สวมอยู่':'สวมใส่';$('fashionMessage').textContent=equipped?'บันทึกลุคนี้แล้ว • มองเห็นในสนามและออนไลน์':'';
}


