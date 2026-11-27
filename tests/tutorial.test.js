import test from 'node:test';
import assert from 'node:assert/strict';
import {createTutorial,TUTORIAL_STEPS} from '../web/tutorial.js';
import {World} from '../server/world.js';
import {fresh,validSave} from '../web/core.js';
test('tutorial advances on real game events and rewards once at the end',async()=>{
 const g={x:0,y:0,map:'town',kills:0,stones:0,auto:false};let rewards=0;
 const tut=createTutorial({key:()=>'k',state:()=>({...g}),onReward:()=>rewards++});tut.start();
 const wait=()=>new Promise(r=>setTimeout(r,450));
 await wait();assert.equal(tut.step,0);g.x=100;await wait();assert.equal(tut.step,1);
 g.map='forest';await wait();assert.equal(tut.step,2);g.kills=1;await wait();assert.equal(tut.step,3);
 g.stones=510;await wait();assert.equal(tut.step,4);g.auto=true;await wait();assert.equal(tut.step,5);
 g.map='town';await wait();assert.equal(tut.step,6);tut.note('shop');await wait();assert.equal(tut.step,7);
 tut.note('buff');await wait();assert.equal(tut.step,8);tut.note('forge');await wait();assert.equal(tut.step,9);
 assert.equal(TUTORIAL_STEPS[9].manual,true);assert.equal(rewards,0);
});
test('server gives the tutorial protection ticket only once and keeps the flag on reload',()=>{
 const w=new World(),s=fresh('sword-cockro'),p=w.join('learner',s);
 w.command(p,{type:'op',op:'tutorialReward'},1);assert.equal(s.protectionTickets,1);assert.equal(s.tutorialRewarded,true);
 w.command(p,{type:'op',op:'tutorialReward'},2);assert.equal(s.protectionTickets,1);
 assert.equal(validSave(JSON.parse(JSON.stringify(s))).tutorialRewarded,true);
});
