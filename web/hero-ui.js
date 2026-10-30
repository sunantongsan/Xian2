// Gameplay IDs remain stable so existing local saves retain their progression.
export const HERO_CLASSES=Object.freeze([
 {id:'sword-cockro',name:'แมงสาบแมน',icon:12,color:'#ee654f',playable:true,description:'ฮีโร่ดาบพลังงาน • แนวหน้าปกป้องเมือง'},
 {id:'demon-scorpion',name:'แมงป่องแมน',icon:13,color:'#b78aff',playable:true,description:'นักฆ่าพิษ • มีดนาโนและสนามชีวพิษวงกว้าง'},
 {id:'sword-dragonfly',name:'แมลงปอเกิล',icon:14,color:'#5eddeb',playable:true,description:'นักธนูปีกแสง • โจมตีระยะไกล ธนูเรลกันและศรโฟตอน'},
 {id:'sword-cricket',name:'จิ้งหรีดแมน',icon:15,color:'#a2df68',playable:true,description:'นักรบค้อนคลื่นเสียง • ทนทาน ตีวงกว้าง'}
]);
export function heroIdentity(id){return HERO_CLASSES.find(h=>h.id===id)||{name:'ฮีโร่รุ่นเดิม',icon:5};}
export function uiArt(index,extra=''){if(!Number.isInteger(index)||index<0||index>15)throw new RangeError('Invalid UI tile');return `<span class="ui-art ${extra}" aria-hidden="true" style="background-position:${index%4/3*100}% ${Math.floor(index/4)/3*100}%"></span>`;}
export function menuTile(id,label,index){return `<button class="menu-tile" id="${id}">${uiArt(index)}<span>${label}</span></button>`;}

