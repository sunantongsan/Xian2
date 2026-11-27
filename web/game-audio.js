// Stream music; keep a bounded effect pool and never synthesise harsh oscillator beeps.
export function skillVoice(skill={}) {
 const form=['wave','dash','bolt','circle','field'].includes(skill.form)?skill.form:'wave';
 const id=String(skill.skillId||skill.id||'');
 const number=Number(id.match(/\d+$/)?.[0]||0);
 const hero=String(skill.hero||'');
 const classPitch=hero==='demon-scorpion'?.86:hero==='sword-cricket'?.76:hero==='sword-dragonfly'?1.16:1;
 return {name:'skill-'+form,rate:Math.min(1.5,classPitch*(.94+(number%11)*.035)),volume:.32};
}
export class GameAudio {
 constructor(){this.enabled=true;this.suspended=false;this.unlocked=false;this.scene='welcome';this.music=new Audio('audio/welcome-loop.mp3');this.music.loop=true;this.music.volume=.28;this.music.preload='none';this.effects=new Map();this.last=new Map();}
 play(a){try{const result=a.play();result?.then(()=>{if(!this.enabled||this.suspended||document.hidden)a.pause();}).catch(()=>{});}catch{}}
 sync(enabled){this.enabled=!!enabled;if(!this.enabled||this.suspended||document.hidden){this.music.pause();for(const a of this.effects.values())a.pause();}else if(this.unlocked&&this.music.paused)this.play(this.music);}
 suspend(value){this.suspended=!!value;this.sync(this.enabled);}
 unlock(enabled){this.unlocked=true;this.sync(enabled);}
 setScene(scene){if(!['welcome','create','world'].includes(scene)||scene===this.scene)return;this.scene=scene;this.music.pause();this.music.src='audio/'+scene+'-loop.mp3';this.music.load();this.sync(this.enabled);}
 effect(name,{volume=.25,rate=1,gap=100}={}){if(!this.enabled||this.suspended||!this.unlocked||document.hidden)return;const now=performance.now();if(now-(this.last.get(name)??-Infinity)<gap)return;this.last.set(name,now);
  let a=this.effects.get(name);if(!a){a=new Audio('audio/'+name+'.mp3');a.preload='none';this.effects.set(name,a);}
  // No more than three simultaneous effects, even during crowded combat.
  const level=this.effects.get('level-up');const active=[...this.effects.values()].filter(x=>!x.paused&&x!==a).sort((a,b)=>Number(a===level)-Number(b===level));while(active.length>=3)active.shift().pause();
  a.pause();a.currentTime=0;a.volume=volume;a.playbackRate=rate;a.preservesPitch=false;this.play(a);
 }
 skill(skill){const v=skillVoice(skill);this.effect(v.name,{...v,gap:160});}
 attack(hero){
  if(hero==='sword-dragonfly'){this.effect('skill-bolt',{volume:.16,rate:1.2,gap:180});return;}
  this.effect('sword-swing',{volume:.23,rate:hero==='sword-cricket'?.88:1,gap:300});
 }
 pickup(kind){
  if(['cockro','gold','huntGold'].includes(kind))this.effect('coin-pickup',{volume:.22,gap:850});
  else this.success();
 }
 fall(){this.effect('hero-fall',{volume:.38,gap:700});}
 hit(){this.effect('hit-soft',{volume:.16,gap:180});}
 tap(){this.effect('menu-click',{volume:.32,gap:75});}
 buff(){this.effect('upgrade-success',{volume:.32,gap:1500});}
 failure(){this.effect('upgrade-failure',{volume:.4,rate:1,gap:1200});}
 levelUp(){this.effect('level-up',{volume:.58,rate:1,gap:1200});}
 success(){this.effect('ui-confirm',{volume:.32,gap:400});}
 // Short synthesized tunes for enhancement results: a bright fanfare or a sad "wah wah".
 jingle(kind){if(!this.enabled||this.suspended||document.hidden)return;try{
  const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;const ctx=this.ctx??=new C();ctx.resume?.();
  const out=ctx.createGain();out.gain.value=.22;out.connect(ctx.destination);const t0=ctx.currentTime+.03;
  const note=(f,at,len,type='triangle',vib=0)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t0+at);
   if(vib){const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=6;lg.gain.value=vib;l.connect(lg);lg.connect(o.frequency);l.start(t0+at);l.stop(t0+at+len);}
   g.gain.setValueAtTime(0,t0+at);g.gain.linearRampToValueAtTime(1,t0+at+.02);g.gain.setValueAtTime(1,t0+at+len*.6);g.gain.exponentialRampToValueAtTime(.001,t0+at+len);
   o.connect(g);g.connect(out);o.start(t0+at);o.stop(t0+at+len+.05);};
  if(kind==='win'){ // C major fanfare: arpeggio then a held chord with sparkle
   [[523.25,0],[659.25,.11],[783.99,.22],[1046.5,.33]].forEach(([f,at])=>note(f,at,.18,'square'));
   [523.25,659.25,783.99,1046.5].forEach(f=>note(f,.48,1.1,'triangle'));[1567.98,2093].forEach((f,i)=>note(f,.6+i*.12,.25,'sine'));
  }else{ // descending trombone "wah wah wah wahhh"
   const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;out.disconnect();out.connect(lp);lp.connect(ctx.destination);
   [[392,0,.32],[369.99,.36,.32],[349.23,.72,.32],[329.63,1.08,1.1]].forEach(([f,at,len],i)=>note(f,at,len,'sawtooth',i===3?7:0));
  }
 }catch{}}
}

