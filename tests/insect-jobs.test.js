import test from 'node:test';import assert from 'node:assert/strict';
import {JOBS,BRANCHES} from '../web/jobs.js';import {fresh,validSave,maxHP} from '../web/core.js';import {knownSkills} from '../web/skills.js';import {makeItem,rollInsectArmor,equip,itemStats,normalizeGear} from '../web/gear.js';import {monsterRewards,collectLoot} from '../web/ground-loot.js';import {World,HEROES} from '../server/world.js';import {DOCTOR_UV} from '../web/mutation.js';import {MAPS,toWorld} from '../web/maps.js';import {take,give} from '../server/commerce.js';
test('six professions and thirteen validated second jobs preserve old character possessions',()=>{
 assert.equal(HEROES.length,6);assert.equal(Object.keys(BRANCHES).length,13);
 for(const [hero,job]of Object.entries(JOBS))for(const branch of job.branches){const s=fresh(hero);s.level=20;s.gold=456789;s.stones=321;s.skillRanks[s.equipped[0]]=4;const inventory=JSON.stringify([s.equip,s.bag]);s.jobBranch=branch;assert.equal(s.jobBranch,branch);assert(knownSkills(s).some(k=>k.id==='job-'+branch));const copy=validSave(JSON.parse(JSON.stringify(s)));assert.equal(copy.jobBranch,branch);assert.equal(copy.gold,456789);assert.equal(copy.stones,321);assert.equal(JSON.stringify([copy.equip,copy.bag]),inventory);assert.equal(copy.skillRanks[s.equipped[0]],4);}
 const old=fresh('sword-cockro');old.level=60;old.mutationStage=2;delete old.jobBranch;assert.equal(validSave(old).jobBranch,'knight');old.jobBranch='wizard';assert.equal(validSave(old).jobBranch,'knight');
});
test('old armor cannot drop or reenter inventory via ground loot',()=>{const s=fresh('sword-cockro');for(const m of [{level:1},{level:60,elite:true},{level:210,boss:true}])assert.equal(rollInsectArmor(m,()=>0),null);assert.equal(collectLoot(s,{kind:'gear',item:makeItem('armor',0,0)}),false);assert(!monsterRewards(s,{level:1,boss:true,id:1,xp:1,gold:1},()=>.99).some(d=>d.item?.insect));});

test('retired class change cannot change the hero, its weapon or allocated stats',()=>{
 const w=new World(),p=w.join('jobs',fresh('sword-mage'));p.s.level=20;
 Object.assign(p,toWorld(DOCTOR_UV,MAPS.town));
 const before=structuredClone(p.s);
 w.command(p,{type:'op',op:'mutate',branch:'sage'},100);
 assert.equal(p.opResult.ok,false);assert.deepEqual(p.s,before);
});
test('healing consumes mana once, restores self, never damages nearby monster and ignores legacy player skill packets',()=>{const w=new World(),s=fresh('sword-acolyte');s.level=5;s.equipped[1]='s2';const p=w.join('healer',s);w.enter(p,'forest');p.hp=1;p.mp=200;const monster=w.mobs.forest[0],hp=monster.hp;w.command(p,{type:'skill',slot:1},100);assert(p.hp>1);assert(p.hp<=maxHP(s));const after=[p.hp,p.mp];w.command(p,{type:'skill',slot:1},100.1);assert.deepEqual([p.hp,p.mp],after);assert.equal(monster.hp,hp);const enemy=w.join('enemy',fresh('sword-cockro'));w.enter(enemy,'forest');enemy.x=p.x+10;enemy.y=p.y;p.hp=1;const enemyHp=enemy.hp;w.command(p,{type:'skillPlayer',slot:1,target:enemy.id},120);assert.equal(p.hp,1);assert.equal(enemy.hp,enemyHp);assert(!p.pendingPvp);});

test('old armor cannot reenter inventory via trade',()=>{const a=fresh('sword-cockro'),b=fresh('sword-cockro'),armor=makeItem('armor',0,0);a.bag.push(armor);assert.throws(()=>take(a,'gear',armor.id,1));assert.throws(()=>give(b,{kind:'gear',item:armor}));assert.equal(b.bag.length,0);});
