export const INSECT_ARMOR={
 beetle:{name:'เกราะด้วงกว่าง',en:'Beetle Carapace',color:'#4e8197',light:'#c6edeb',bonus:{def:1.5,hp:20}},
 mantis:{name:'เกราะตั๊กแตนตำข้าว',en:'Mantis Carapace',color:'#4f9766',light:'#daec9e',bonus:{atk:2}},
 dragonfly:{name:'เกราะแมลงปอ',en:'Dragonfly Carapace',color:'#459ead',light:'#bdffff',bonus:{speed:2}},
 ant:{name:'เกราะมดแดง',en:'Red Ant Carapace',color:'#b95e48',light:'#ffd5a2',bonus:{hp:30}},
 butterfly:{name:'เกราะผีเสื้อ',en:'Butterfly Carapace',color:'#9865b9',light:'#f5caff',bonus:{mp:12,spell:.02}},
 cricket:{name:'เกราะจิ้งหรีด',en:'Cricket Carapace',color:'#92944c',light:'#fff1a9',bonus:{crit:.01}}
};
export const insectFields=it=>it?.slot==='armor'&&Object.hasOwn(INSECT_ARMOR,it.insect)?{insect:it.insect}:{};
