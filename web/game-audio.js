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
 constructor(){this.enabled=true;this.unlocked=false;this.scene='welcome';this.music=new Audio('audio/welcome-loop.mp3');this.music.loop=true;this.music.volume=.28;this.music.preload='none';this.effects=new Map();this.last=new Map();}
 play(a){try{const result=a.play();result?.then(()=>{if(!this.enabled||document.hidden)a.pause();}).catch(()=>{});}catch{}}
 sync(enabled){this.enabled=!!enabled;if(!this.enabled||document.hidden){this.music.pause();for(const a of this.effects.values())a.pause();}else if(this.unlocked&&this.music.paused)this.play(this.music);}
 unlock(enabled){this.unlocked=true;this.sync(enabled);}
 setScene(scene){if(!['welcome','create','world'].includes(scene)||scene===this.scene)return;this.scene=scene;this.music.pause();this.music.src='audio/'+scene+'-loop.mp3';this.music.load();this.sync(this.enabled);}
 effect(name,{volume=.25,rate=1,gap=100}={}){if(!this.enabled||!this.unlocked||document.hidden)return;const now=performance.now();if(now-(this.last.get(name)??-Infinity)<gap)return;this.last.set(name,now);
  let a=this.effects.get(name);if(!a){a=new Audio('audio/'+name+'.mp3');a.preload='none';this.effects.set(name,a);}
  // No more than three simultaneous effects, even during crowded combat.
  const active=[...this.effects.values()].filter(x=>!x.paused&&x!==a);while(active.length>=3)active.shift().pause();
  a.pause();a.currentTime=0;a.volume=volume;a.playbackRate=rate;a.preservesPitch=false;this.play(a);
 }
 skill(skill){const v=skillVoice(skill);this.effect(v.name,{...v,gap:160});}
 attack(hero){this.effect(hero==='sword-dragonfly'?'skill-bolt':'skill-dash',{volume:.16,rate:hero==='sword-cricket'?.8:1.2,gap:180});}
 hit(){this.effect('hit-soft',{volume:.16,gap:180});}
 tap(){this.effect('ui-tap',{volume:.18,gap:90});}
 buff(){this.effect('upgrade-success',{volume:.32,gap:1500});}
 success(){this.effect('ui-confirm',{volume:.32,gap:400});}
}

