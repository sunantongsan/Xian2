import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {GameAudio,skillVoice} from '../web/game-audio.js';
import {knownSkills} from '../web/skills.js';
class FakeAudio {constructor(src){this.src=src;this.paused=true;this.plays=0;}play(){this.paused=false;this.plays++;return Promise.resolve();}pause(){this.paused=true;}load(){}}
globalThis.Audio=FakeAudio;globalThis.document={hidden:false};
test('failed upgrade has a separate short sound and obeys mute',()=>{
 const a=new GameAudio();a.unlock(true);a.failure();assert.equal(a.effects.get('upgrade-failure').src,'audio/upgrade-failure.mp3');assert.ok(!a.effects.has('level-up'));a.sync(false);assert.ok(a.effects.get('upgrade-failure').paused);
});
test('level up uses supplied chime once and combat does not interrupt it; mute still stops it',()=>{
 const a=new GameAudio();a.unlock(true);a.levelUp();a.levelUp();
 const chime=a.effects.get('level-up');assert.equal(chime.src,'audio/level-up.mp3');assert.equal(chime.plays,1);assert.equal(chime.playbackRate,1);
 for(const form of ['wave','dash','bolt','circle','field'])a.skill({form});
 assert.equal(chime.paused,false);assert.ok([...a.effects.values()].filter(x=>!x.paused).length<=3);
 a.sync(false);assert.equal(chime.paused,true);a.levelUp();assert.equal(chime.plays,1);
});
test('every hero skill maps to an existing clip and distinct voice within its class',()=>{
 for(const hero of ['sword-cockro','demon-scorpion','sword-cricket','sword-dragonfly']){const voices=knownSkills({hero,recipes:[]}).map(k=>skillVoice({...k,hero}));assert.equal(new Set(voices.map(v=>v.name+v.rate)).size,voices.length);for(const v of voices)assert.ok(existsSync('web/audio/'+v.name+'.mp3'));}
});
test('welcome requires interaction; scene changes stream one track and mute stops every channel',async()=>{
 const a=new GameAudio();a.sync(true);assert.equal(a.music.plays,0);a.unlock(true);assert.equal(a.music.plays,1);a.setScene('create');assert.equal(a.music.src,'audio/create-loop.mp3');a.skill({form:'wave'});assert.equal(a.effects.get('skill-wave').paused,false);a.sync(false);assert.ok(a.music.paused);assert.ok([...a.effects.values()].every(x=>x.paused));a.setScene('world');assert.ok(a.music.paused);a.skill({form:'bolt'});assert.equal(a.effects.size,1);await Promise.resolve();assert.ok(a.music.paused);
});
test('hidden page silences playback; rapid duplicate casts are throttled and overlap is bounded',()=>{
 const a=new GameAudio();a.unlock(true);for(const form of ['wave','dash','bolt','circle','field'])a.skill({form});assert.equal([...a.effects.values()].filter(x=>!x.paused).length,3);a.skill({form:'field'});assert.equal(a.effects.get('skill-field').plays,1);document.hidden=true;a.sync(true);assert.ok([...a.effects.values(),a.music].every(x=>x.paused));a.success();assert.ok(!a.effects.has('ui-confirm'));document.hidden=false;
});
