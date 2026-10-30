// Cosmetic ownership is separate from combat gear, shared by offline saves and the server.
export const FASHION_SETS=[
 {id:'cowboy',name:'คาวบอยพเนจร',color:'#d5a86e',file:'fashion/cowboy.webp'},
 {id:'wuxia',name:'จอมยุทธเมฆาหยก',color:'#7ed4b2',file:'fashion/wuxia.webp'},
 {id:'knight',name:'อัศวินดวงดาว',color:'#98bfff',file:'fashion/knight-open.webp'}
];
export const FASHION_ITEMS=FASHION_SETS.flatMap(set=>[
 {id:set.id+'-hat',set:set.id,slot:'hat',name:({cowboy:'หมวกคาวบอยเทอร์ควอยซ์',wuxia:'หมวกจอมยุทธหยก',knight:'หมวกอัศวินดวงดาว'})[set.id],file:set.file,color:set.color},
 {id:set.id+'-outfit',set:set.id,slot:'outfit',name:'ชุด'+set.name,file:set.file,color:set.color}
]);
const byId=new Map(FASHION_ITEMS.map(it=>[it.id,it]));
export const fashionItem=id=>byId.get(id)||null;
export function normalizeFashion(s,v=s){
 const raw=v.fashion;const owned=Array.isArray(raw?.owned)?[...new Set(raw.owned.filter(id=>byId.has(id)))]:FASHION_ITEMS.map(it=>it.id);
 const equipped={hat:null,outfit:null};for(const slot of ['hat','outfit']){const id=raw?.equipped?.[slot];if(owned.includes(id)&&byId.get(id)?.slot===slot)equipped[slot]=id;}
 s.fashion={owned,equipped};return s.fashion;
}
export function wearFashion(s,id){const it=fashionItem(id);if(!it)return false;const f=s.fashion||normalizeFashion(s);if(!f.owned.includes(id))return false;f.equipped[it.slot]=id;return true;}
export function removeFashion(s,slot){if(slot!=='hat'&&slot!=='outfit')return false;const f=s.fashion||normalizeFashion(s);f.equipped[slot]=null;return true;}
export function appearance(s){return {...(s.fashion?.equipped||{hat:null,outfit:null})};}

