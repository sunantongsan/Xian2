// Full-body equipment sets. IDs also identify the reviewed character artwork.
const suit=(name,en,bonus)=>({name:'ชุด'+name,en:en+' Suit',bonus});
export const INSECT_ARMOR={
 'cockroach-male':suit('แมงสาบชาย','Cockroach Male',{hp:30}),
 'cockroach-female':suit('แมงสาบหญิง','Cockroach Female',{hp:30}),
 'ladybug-male':suit('เต่าทองชาย','Ladybug Male',{def:1.5,hp:20}),
 'ladybug-female':suit('เต่าทองหญิง','Ladybug Female',{def:1.5,hp:20}),
 'scorpion-male':suit('แมงป่องชาย','Scorpion Male',{atk:2,crit:.01}),
 'scorpion-female':suit('แมงป่องหญิง','Scorpion Female',{atk:2,crit:.01}),
 'beetle-female':suit('ด้วงกว่างหญิง','Beetle Female',{def:1.5,hp:20}),
 'dragonfly-female':suit('แมงปอหญิง','Dragonfly Female',{speed:2}),
 'mantis-male':suit('ตั๊กแตนชาย','Mantis Male',{atk:2}),
 'mantis-female':suit('ตั๊กแตนหญิง','Mantis Female',{atk:2})
};
export const insectFields=it=>it?.slot==='armor'&&Object.hasOwn(INSECT_ARMOR,it.insect)?{insect:it.insect}:{};
export const isRetiredArmor=it=>!!it&&(['helm','gloves','boots','wings'].includes(it.slot)||(it.slot==='armor'&&!insectFields(it).insect));
export const suitIcon=it=>insectFields(it).insect?`items/insect-suits/${it.insect}.webp`:null;
