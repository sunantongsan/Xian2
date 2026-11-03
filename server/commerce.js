import {randomUUID} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync,unlinkSync,openSync,closeSync,fsyncSync} from 'node:fs';
import {join} from 'node:path';
import {BAG_SIZE} from '../web/gear.js';
import {UPGRADE_ITEMS} from '../web/upgrade-items.js';
import {EXP_TICKETS} from '../web/exp-tickets.js';
const CAPS={gold:1e10,stones:1e7};
const integer=(n,max)=>Number.isSafeInteger(n)&&n>0&&n<=max;
function need(ok,message){if(!ok)throw Error(message);}
export function take(s,kind,id,quantity){
 need(integer(quantity,99999),'invalid_quantity');
 if(kind==='gear'){need(quantity===1,'invalid_quantity');const i=s.bag.findIndex(it=>it.id===id);need(i>=0,'item_missing');return {kind,id,quantity:1,item:s.bag.splice(i,1)[0]};}
 const [holder,key]=stack(s,kind,id);need((holder[key]||0)>=quantity,'item_missing');holder[key]-=quantity;return {kind,id,quantity};
}
function stack(s,kind,id){
 if(kind==='material'&&Object.hasOwn(UPGRADE_ITEMS,id))return [s.upgradeItems,id];
 if(kind==='ticket'&&Object.hasOwn(EXP_TICKETS,id))return [s.expTickets,id];
 if(kind==='potion'&&['hp','mp'].includes(id))return [s,id==='hp'?'potions':'mpPotions'];
 throw Error('item_not_transferable');
}
export function give(s,cargo){
 if(cargo.kind==='gear'){need(s.bag.length<BAG_SIZE,'bag_full');need(!s.bag.some(it=>it.id===cargo.item.id)&&!Object.values(s.equip).some(it=>it?.id===cargo.item.id),'duplicate_item');s.bag.push(structuredClone(cargo.item));return;}
 const [holder,key]=stack(s,cargo.kind,cargo.id);need((holder[key]||0)+cargo.quantity<=99999,'bag_full');holder[key]=(holder[key]||0)+cargo.quantity;
}
// Synchronous WAL commits all affected saves and the ledger before acknowledging.
// Failed writes fence gameplay until restart replays the durable transaction.
export function createCommerce(directory,{players,getActor=id=>players().get(id),capture=()=>{},writeHook}={}){
 const ledgerPath=join(directory,'commerce.json'),walPath=join(directory,'commerce-pending.json');let failed=false;
 const syncDir=()=>{const fd=openSync(directory,'r');try{fsyncSync(fd);}finally{closeSync(fd);}};
 const write=(file,value)=>{writeFileSync(file+'.tmp',JSON.stringify(value),{mode:0o600});const fd=openSync(file+'.tmp','r');try{fsyncSync(fd);}finally{closeSync(fd);}renameSync(file+'.tmp',file);syncDir();};
 function apply(tx){for(const [id,s]of Object.entries(tx.characters)){need(/^[a-f0-9]{64}$/.test(id),'invalid_character');write(join(directory,id+'.json'),s);}write(ledgerPath,tx.ledger);unlinkSync(walPath);syncDir();}
 if(existsSync(walPath))apply(JSON.parse(readFileSync(walPath,'utf8')));
 let ledger=existsSync(ledgerPath)?JSON.parse(readFileSync(ledgerPath,'utf8')):{revision:0,vaults:{},shops:{}};
 const vault=(l,account)=>l.vaults[account]??={gold:0,stones:0,items:[]};
 function ready(p){need(!failed,'save_unavailable');need(p&&players().get(p.id)===p&&!p.offline,'seller_offline');need(!p.economyBusy,'account_busy');need(p.map==='town'&&p.hp>0&&Date.now()/1000-(p.lastPvp??-Infinity)>=10,'town_only');}
 function active(shop){return shop.open;}
 function view(p){const own=ledger.shops[p.account];return {revision:ledger.revision,vault:structuredClone(ledger.vaults[p.account]||{gold:0,stones:0,items:[]}),ownShop:structuredClone(own||{open:false,title:'',listings:[]}),shops:Object.values(ledger.shops).filter(active).map(shop=>({character:shop.character,title:shop.title,promotion:shop.promotion||'',name:shop.name,x:shop.x,y:shop.y,listings:structuredClone(shop.listings)}))};}
 function run(p,d){ready(p);if(d.action==='view')return view(p);need(d.revision===ledger.revision,'stale_market');const next=structuredClone(ledger),changed=new Map();const state=actor=>{if(!changed.has(actor)){capture(actor);changed.set(actor,structuredClone(actor.s));}return changed.get(actor);};const s=state(p),v=vault(next,p.account);let shop=next.shops[p.account];
 switch(d.action){
 case 'depositMoney':case 'withdrawMoney':{need(Object.hasOwn(CAPS,d.currency),'invalid_currency');need(integer(d.amount,CAPS[d.currency]),'invalid_quantity');const [from,to]=d.action==='depositMoney'?[s,v]:[v,s];need(from[d.currency]>=d.amount,'insufficient_funds');need(to[d.currency]+d.amount<=CAPS[d.currency],'wallet_full');from[d.currency]-=d.amount;to[d.currency]+=d.amount;break;}
 case 'depositItem':need(v.items.length<120,'vault_full');v.items.push({...take(s,d.kind,d.id,d.quantity),key:randomUUID()});break;
 case 'withdrawItem':{const i=v.items.findIndex(it=>it.key===d.key);need(i>=0,'item_missing');give(s,v.items[i]);v.items.splice(i,1);break;}
 case 'openShop':{need(typeof d.title==='string'&&d.title.trim().length>=2&&d.title.trim().length<=32,'invalid_title');shop??={listings:[]};need(d.promotion===undefined||(typeof d.promotion==='string'&&d.promotion.trim().length<=120),'invalid_promotion');shop.promotion=(d.promotion??shop.promotion??'').trim();shop.title=d.title.trim();shop.open=true;shop.character=p.id;shop.name=p.name;shop.x=p.x;shop.y=p.y;next.shops[p.account]=shop;break;}
 case 'updatePromotion':need(shop,'shop_missing');need(typeof d.promotion==='string'&&d.promotion.trim().length<=120,'invalid_promotion');shop.promotion=d.promotion.trim();break;
 case 'closeShop':need(shop,'shop_missing');shop.open=false;break;
 case 'listItem':{need(shop?.character===p.id,'shop_missing');need(shop.listings.length<12,'shop_full');need(Object.hasOwn(CAPS,d.currency)&&integer(d.price,CAPS[d.currency]),'invalid_price');shop.listings.push({key:randomUUID(),cargo:take(s,d.kind,d.id,d.quantity),currency:d.currency,price:d.price});break;}
 case 'cancelListing':{need(shop,'shop_missing');const i=shop.listings.findIndex(it=>it.key===d.key);need(i>=0,'item_missing');give(s,shop.listings[i].cargo);shop.listings.splice(i,1);break;}
 case 'buy':{const target=Object.entries(next.shops).find(([account,x])=>account!==p.account&&x.character===d.seller);need(target,'shop_missing');const sale=target[1];need(active(sale),'seller_offline');const seller=getActor(sale.character);need(seller,'shop_missing');need(!seller.economyBusy,'account_busy');need(Math.hypot(p.x-sale.x,p.y-sale.y)<=350,'seller_too_far');const i=sale.listings.findIndex(it=>it.key===d.key);need(i>=0,'item_missing');const item=sale.listings[i];need(d.price===item.price&&d.currency===item.currency,'price_changed');need(s[item.currency]>=item.price,'insufficient_funds');const recipient=state(seller);need(recipient[item.currency]+item.price<=CAPS[item.currency],'wallet_full');give(s,item.cargo);s[item.currency]-=item.price;recipient[item.currency]+=item.price;sale.sales??=[];sale.sales.push({at:Date.now(),buyer:p.name,cargo:item.cargo,currency:item.currency,price:item.price});sale.sales=sale.sales.slice(-50);sale.listings.splice(i,1);break;}
 default:throw Error('invalid_request');
 }
 next.revision++;const tx={ledger:next,characters:Object.fromEntries([...changed].map(([actor,save])=>[actor.id,save]))};try{write(walPath,tx);writeHook?.();apply(tx);}catch{failed=true;throw Error('save_unavailable');}ledger=next;for(const [actor,save]of changed){actor.s=save;actor.dirty=false;actor.lastSaved=Date.now();}refreshSigns();return view(p);
 }
 function refreshSigns(){for(const p of players().values()){const shop=ledger.shops[p.account];p.shopTitle=shop?.character===p.id&&active(shop)?shop.title:'';}}
 function removeAccount(account){const next=structuredClone(ledger);delete next.vaults[account];delete next.shops[account];next.revision++;try{write(walPath,{ledger:next,characters:{}});apply({ledger:next,characters:{}});ledger=next;}catch{failed=true;throw Error('save_unavailable');}}
 const stalls=()=>Object.values(ledger.shops).filter(active).map(x=>({character:x.character,title:x.title,promotion:x.promotion||'',name:x.name,x:x.x,y:x.y,count:x.listings.length}));
 const ownsListedItems=(account,id)=>ledger.shops[account]?.character===id&&ledger.shops[account].listings.length>0;
 return {run,view,refreshSigns,stalls,removeAccount,ownsListedItems,get failed(){return failed;}};
}

