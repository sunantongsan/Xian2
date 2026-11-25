import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,validSave} from '../web/core.js';
import {SKILL_BOOKS,compileSkill,knownSkills,buySkillBook,skillTargets} from '../web/skills.js';
import {World} from '../server/world.js';
import {drawSwordSkill,skillBookIcon,SWORD_FX} from '../web/sword-skills-fx.js';
test('eight new sword books, unique ids and names, price rises with power, 2 to 30 baht',()=>{assert.equal(SKILL_BOOKS[0].price,2e6);assert.equal(SKILL_BOOKS[7].price,30e6);
 assert.equal(SKILL_BOOKS.length,8);assert.equal(new Set(SKILL_BOOKS.map(b=>b.id)).size,8);assert.equal(new Set(SKILL_BOOKS.map(b=>b.th)).size,8);assert.equal(new Set(SKILL_BOOKS.map(b=>b.fx)).size,8);
 for(let i=1;i<8;i++){assert(SKILL_BOOKS[i].price>SKILL_BOOKS[i-1].price);}
 for(const b of SKILL_BOOKS){const k=compileSkill(b);assert(k&&k.power>0&&k.mp>0&&k.cd>0,b.id);assert.equal(b.level,1);assert(SWORD_FX[b.fx]);assert(skillBookIcon(b.id).startsWith('data:image/svg+xml'));}
 assert(compileSkill(SKILL_BOOKS[7]).power>compileSkill(SKILL_BOOKS[0]).power);
});
test('a new hero knows no skills; old level skills are gone after loading',()=>{
 const s=fresh('sword-cockro');assert.deepEqual(knownSkills(s),[]);assert.deepEqual(s.equipped,[null,null,null,null,null]);
 const old=fresh('sword-cockro');old.level=80;old.equipped=['s1','s2','s3',null,null];old.skillRanks={s1:5};old.recipes=[{id:'custom0',form:'wave',element:'fire',mods:[],level:60}];
 const v=validSave(JSON.parse(JSON.stringify(old)));assert.deepEqual(knownSkills(v),[]);assert.deepEqual(v.equipped,[null,null,null,null,null]);assert.deepEqual(v.skillRanks,{});assert.equal(v.skillPoints,79*10);
});
test('buying a book costs COCKRO, teaches the skill at any level, auto-equips and cannot repeat',()=>{
 const s=fresh('sword-cockro');s.stones=SKILL_BOOKS[7].price;
 assert(buySkillBook(s,'b8'));assert.equal(s.stones,0);assert.deepEqual(s.skillBooks,['b8']);assert.equal(s.equipped[0],'b8');assert.equal(s.level,1);
 assert.equal(buySkillBook(s,'b8'),false);assert.equal(buySkillBook(s,'b1'),false);assert.equal(buySkillBook(s,'nope'),false);
 s.stones=SKILL_BOOKS[1].price-1;assert.equal(buySkillBook(s,'b2'),false);assert.equal(s.stones,SKILL_BOOKS[1].price-1);
 const v=validSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(v.skillBooks,['b8']);assert.equal(v.equipped[0],'b8');
});
test('server sells books only at home and the bought skill casts with its sword effect id',()=>{
 const w=new World(),s=fresh('sword-cockro');s.stones=3_000_000;const p=w.join('reader',s);
 w.enter(p,'forest');w.command(p,{type:'op',op:'buySkillBook',id:'b1'},1);assert.deepEqual(s.skillBooks,[]);
 w.enter(p,'town');w.command(p,{type:'op',op:'buySkillBook',id:'b1'},2);assert.deepEqual(s.skillBooks,['b1']);assert.equal(s.stones,1_000_000);
 w.enter(p,'forest');p.mp=999;const e=w.mobs.forest[0];Object.assign(e,{x:p.x+60,y:p.y,hp:99999});w.mobs.forest=[e];
 w.command(p,{type:'skill',slot:0,target:e.id},10);const ev=w.events.find(x=>x.kind==='skill');assert.equal(ev.skillId,'b1');assert(e.hp<99999);
});
test('every sword effect draws finite geometry across its whole life',()=>{
 const calls=[];const ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:(k==='createLinearGradient'||k==='createRadialGradient')?()=>({addColorStop(){}}):(...a)=>{for(const v of a)if(typeof v==='number'&&!Number.isFinite(v))throw Error('non-finite '+String(k));calls.push(k);},set:(o,k,v)=>{o[k]=v;return true;}});
 for(const b of SKILL_BOOKS)for(const quality of ['auto','low'])for(let f=0;f<=10;f++){const max=b.life,e={skillId:b.id,form:b.form,x:100,y:200,aim:{x:400,y:260},radius:b.combat.radius||40,max,life:max*(1-f/10)+1e-6};assert(drawSwordSkill(ctx,e,(x,y)=>({x:x-y,y:(x+y)/2}),1,quality));}
 assert(calls.length>1000);
});
test('skill targets follow form footprints',()=>{
 const enemies=[{x:100,y:0,hp:1},{x:0,y:300,hp:1}];
 const wave=compileSkill(SKILL_BOOKS[0]);assert.equal(skillTargets(wave,{x:0,y:0},{x:300,y:0},enemies).length,1);
 const circle=compileSkill(SKILL_BOOKS[1]);assert.equal(skillTargets(circle,{x:0,y:0},{x:0,y:0},enemies).length,1);
});
