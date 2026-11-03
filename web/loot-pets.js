export const PET_PRICE=20000, PET_SEARCH_RADIUS=400, PET_PICKUP_RADIUS=45;
export const LOOT_PETS=Object.freeze({dog:{name:'หมา',tile:0},cat:{name:'แมว',tile:1},chicken:{name:'ไก่',tile:2},tiger:{name:'เสือ',tile:3},buffalo:{name:'ควาย',tile:4}});
export function normalizePets(s,v=s){const old=v.lootPets||{};const owned=Array.isArray(old.owned)?[...new Set(old.owned.filter(id=>typeof id==='string'&&Object.hasOwn(LOOT_PETS,id)))]:[];s.lootPets={owned,active:owned.includes(old.active)?old.active:null};}
export function buyPet(s,id){if(typeof id!=='string'||!Object.hasOwn(LOOT_PETS,id))return false;normalizePets(s);if(s.lootPets.owned.includes(id)||!Number.isFinite(s.gold)||s.gold<PET_PRICE)return false;s.gold-=PET_PRICE;s.lootPets.owned.push(id);s.lootPets.active=id;return true;}
export function equipPet(s,id){normalizePets(s);if(id!==null&&!s.lootPets.owned.includes(id))return false;s.lootPets.active=id;return true;}
export function stepPet(p,loot,dt,now,trace){
 const id=p.s.lootPets?.active;if(!id||!Object.hasOwn(LOOT_PETS,id)||p.hp<=0||p.offline){p.pet=null;return;}
 if(!p.pet||p.pet.id!==id||p.pet.map!==p.map||Math.hypot(p.pet.x-p.x,p.pet.y-p.y)>650)p.pet={id,map:p.map,x:p.x,y:p.y,face:1,moving:false};
 const pet=p.pet,targets=loot.filter(d=>d.owner===p.id&&d.map===p.map&&now<d.expires&&now-d.created>=.35&&Math.hypot(d.x-p.x,d.y-p.y)<=PET_SEARCH_RADIUS).sort((a,b)=>Math.hypot(a.x-pet.x,a.y-pet.y)-Math.hypot(b.x-pet.x,b.y-pet.y));
 const target=targets.find(d=>Math.hypot(trace(pet,d).x-d.x,trace(pet,d).y-d.y)<1)||p;
 const dx=target.x-pet.x,dy=target.y-pet.y,d=Math.hypot(dx,dy),stop=target===p?65:8,step=Math.min(Math.max(0,d-stop),Math.max(0,Math.min(dt,.25))*360);
 pet.moving=step>1;if(step){const pos=trace(pet,{x:pet.x+dx/d*step,y:pet.y+dy/d*step});pet.face=dx-dy<0?-1:1;pet.x=pos.x;pet.y=pos.y;}
}
