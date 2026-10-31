export const MERCHANT_UV=[.174,.407];
export const MERCHANT_RANGE=150;
export const MERCHANT_OPS=new Set(['buy','buyMP','buyUpgradeItem','buyShopGear','exchangeGold']);

export function buyMerchantStack(s,op,id,quantity=1,items){
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>100)return false;
 let currency,key,price,inventory;
 if(op==='buy'||op==='buyMP'){currency='gold';key=op==='buy'?'potions':'mpPotions';price=op==='buy'?50:60;inventory=s;}
 else if(op==='buyUpgradeItem'&&Object.hasOwn(items,id)){currency='stones';key=id;price=items[id].price;inventory=s.upgradeItems;}
 else return false;
 if(!inventory||!Number.isFinite(s[currency])||s[currency]<price*quantity||(inventory[key]||0)+quantity>99999)return false;
 s[currency]-=price*quantity;inventory[key]=(inventory[key]||0)+quantity;return true;
}
