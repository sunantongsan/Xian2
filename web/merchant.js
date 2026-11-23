// Bottles keep their purchased strength across level-ups. Legacy bottles restore 50%.
export const POTIONS={
 hpSmall:{type:'hp',restore:80,price:12},hpMedium:{type:'hp',restore:800,price:120},hpLarge:{type:'hp',restore:8000,price:1200},
 mpSmall:{type:'mp',restore:40,price:10},mpMedium:{type:'mp',restore:240,price:60},mpLarge:{type:'mp',restore:1200,price:300}
};
const totalKey=type=>type==='hp'?'potions':'mpPotions';

export function normalizePotionStock(s,input){
 s.potionStock={};
 const remaining={hp:s.potions,mp:s.mpPotions};
 for(const [id,{type}] of Object.entries(POTIONS)){
  const n=input?.[id];
  if(!Number.isSafeInteger(n)||n<1)continue;
  const count=Math.min(remaining[type],n);
  if(count){s.potionStock[id]=count;remaining[type]-=count;}
 }
}
export function addBottle(s,id,count){
 if(!Object.hasOwn(POTIONS,id)||!Number.isSafeInteger(count)||count<1)return false;
 const key=totalKey(POTIONS[id].type);
 if(s[key]+count>99999)return false;
 s.potionStock??={};
 s.potionStock[id]=(s.potionStock[id]||0)+count;
 s[key]+=count;return true;
}
export function potionStacks(s,type){
 const stacks=Object.entries(POTIONS).filter(([id,p])=>p.type===type&&s.potionStock?.[id]>0)
  .map(([id,p])=>({id,type,restore:p.restore,count:s.potionStock[id]}));
 const legacy=s[totalKey(type)]-stacks.reduce((n,p)=>n+p.count,0);
 if(legacy>0)stacks.push({id:type,type,restore:null,count:legacy});
 return stacks;
}
// Prefer the smallest bottle that covers the missing points, otherwise use the strongest.
export function drinkPotion(s,type,current,max){
 if(current>=max)return current;
 const stacks=potionStacks(s,type).map(p=>({...p,heal:p.restore??max*.5})).sort((a,b)=>a.heal-b.heal);
 const bottle=stacks.find(p=>p.heal>=max-current)??stacks.at(-1);
 if(!bottle)return current;
 if(bottle.restore!==null&&--s.potionStock[bottle.id]===0)delete s.potionStock[bottle.id];
 s[totalKey(type)]--;
 return Math.min(max,current+bottle.heal);
}
export const MERCHANT_UV=[.235,.48];
export const MERCHANT_RANGE=150;
export const MERCHANT_OPS=new Set(['buyProtectionTicket','buyPet','buyExpTicket','buy','buyMP','buyUpgradeItem','buyShopGear','exchangeGold']);

export function buyMerchantStack(s,op,id,quantity=1,items){
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>100)return false;
 let currency,key,price,inventory;
 if(op==='buy'||op==='buyMP'){
  const type=op==='buy'?'hp':'mp',bottle=id??(type+'Small');
  if(!Object.hasOwn(POTIONS,bottle)||POTIONS[bottle].type!==type)return false;
  const cost=POTIONS[bottle].price*quantity;
  if(!Number.isFinite(s.gold)||s.gold<cost||!addBottle(s,bottle,quantity))return false;
  s.gold-=cost;return true;
 }
 else if(op==='buyUpgradeItem'&&Object.hasOwn(items,id)){currency=items[id].currency||'stones';key=id;price=items[id].price;inventory=s.upgradeItems;}
 else return false;
 if(!inventory||!Number.isFinite(s[currency])||s[currency]<price*quantity||(inventory[key]||0)+quantity>99999)return false;
 s[currency]-=price*quantity;inventory[key]=(inventory[key]||0)+quantity;return true;
}



