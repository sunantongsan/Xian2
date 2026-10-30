// At most one effect per channel; streaming music is not decoded on the game thread.
export class GameAudio {
 constructor(){this.enabled=true;this.music=new Audio('audio/town-loop.mp3');this.music.loop=true;this.music.volume=.12;this.music.preload='none';this.win=new Audio('audio/upgrade-success.mp3');this.win.volume=.5;this.win.preload='auto';this.blast=new Audio('audio/explosion.mp3');this.blast.volume=.2;this.blast.preload='auto';this.lastBlast=0;}
 sync(enabled){this.enabled=enabled;if(!enabled||document.hidden){this.music.pause();this.win.pause();this.blast.pause();}else if(this.music.paused)this.music.play().catch(()=>{});}
 success(){if(!this.enabled||document.hidden)return;this.win.currentTime=0;this.win.play().catch(()=>{});}
 explosion(){const now=performance.now();if(!this.enabled||document.hidden||now-this.lastBlast<800)return;this.lastBlast=now;this.blast.currentTime=0;this.blast.play().catch(()=>{});}
}
