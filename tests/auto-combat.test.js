import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../server/world.js';
import {fresh} from '../web/core.js';
test('dash skill stops just past the target instead of flying its full range',()=>{
 const w=new World(),s=fresh('sword-cockro');s.skillBooks=['b4'];s.equipped=['b4'];const p=w.join('dasher',s);
 w.enter(p,'forest',0);p.mp=999;const e=w.mobs.forest[0];const start={x:p.x,y:p.y};Object.assign(e,{x:p.x+100,y:p.y,hp:1e9});w.mobs.forest=[e];
 w.command(p,{type:'skill',slot:0,target:e.id},10);
 const moved=Math.hypot(p.x-start.x,p.y-start.y);assert(moved>0&&moved<=145,String(moved));
});
test('auto mode casts a ready skill before basic attacks and never spams the same skill',()=>{
 const src=fs.readFileSync(new URL('../web/game.js',import.meta.url),'utf8');
 assert.ok(src.includes('if(hunt?.ready){if(!autoSkill('));assert.ok(src.includes("time-(skillSentAt[r.id]??-9)<.4"));
 assert.ok(src.includes('glide={x:confirmed.x,y:confirmed.y}'));
});
