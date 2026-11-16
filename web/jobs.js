import {INSECT_JOBS,profession} from './insect-professions.js';
// Stable character IDs; profession is selected from equipped armor at level 20.
export const JOBS={
 'sword-cockro':{name:'นักดาบ',en:'Swordsman',color:'#ee654f',icon:12,range:120,branches:['knight','crusader']},
 'sword-mage':{name:'นักเวท',en:'Mage',color:'#b78aff',icon:15,range:320,branches:['wizard','sage']},
 'sword-dragonfly':{name:'นักธนู',en:'Archer',color:'#5eddeb',icon:14,range:340,branches:['hunter','bard','dancer']},
 'sword-acolyte':{name:'นักบวช',en:'Acolyte',color:'#ffe6a4',icon:12,range:250,branches:['priest','monk']},
 'demon-scorpion':{name:'โจร',en:'Thief',color:'#a2df68',icon:13,range:120,branches:['assassin','rogue']},
 'sword-cricket':{name:'พ่อค้า',en:'Merchant',color:'#e9b46c',icon:15,range:120,branches:['blacksmith','alchemist']}
};
export const BRANCHES={
 knight:{name:'อัศวิน',en:'Knight',form:'dash',element:'wind',mods:['force']},
 crusader:{name:'ผู้พิทักษ์',en:'Crusader',form:'circle',element:'lightning',mods:['drain']},
 wizard:{name:'จอมเวท',en:'Wizard',form:'field',element:'fire',mods:['wide','force']},
 sage:{name:'ปราชญ์',en:'Sage',form:'wave',element:'ice',mods:['quick']},
 hunter:{name:'นายพราน',en:'Hunter',form:'bolt',element:'wind',mods:['pierce','force']},
 bard:{name:'นักกวี',en:'Bard',form:'circle',element:'wind',mods:['wide','drain']},
 dancer:{name:'นักเต้น',en:'Dancer',form:'circle',element:'lightning',mods:['quick']},
 priest:{name:'มหาปุโรหิต',en:'Priest',form:'circle',element:'lightning',mods:[],effect:'heal'},
 monk:{name:'นักบวชนักสู้',en:'Monk',form:'dash',element:'lightning',mods:['force']},
 assassin:{name:'นักฆ่า',en:'Assassin',form:'dash',element:'poison',mods:['force']},
 rogue:{name:'จอมโจร',en:'Rogue',form:'wave',element:'poison',mods:['drain']},
 blacksmith:{name:'ช่างตีเหล็ก',en:'Blacksmith',form:'circle',element:'fire',mods:['force']},
 alchemist:{name:'นักเล่นแร่แปรธาตุ',en:'Alchemist',form:'field',element:'poison',mods:['wide']}
};
export const validBranch=(hero,id)=>typeof id==='string'&&JOBS[hero]?.branches.includes(id);
export const branchFor=s=>validBranch(s?.hero,s?.jobBranch)?s.jobBranch:JOBS[s?.hero]?.branches[0];
export const baseAttackRange=state=>typeof state==='object'?(INSECT_JOBS[profession(state)]?.range||120):(JOBS[state]?.range||120);

