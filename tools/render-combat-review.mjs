import {createRequire} from 'node:module';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
import {drawHero} from '../web/hero-animation.js';
import fs from 'node:fs';
const canvas=createCanvas(960,640),c=canvas.getContext('2d');
const im=await loadImage(new URL('../web/heroes/cockro-combat-v2.webp',import.meta.url).pathname),images=new Map([['heroes/cockro-combat-v2.webp',im]]);
fs.mkdirSync('review/frames',{recursive:true});
for(let i=0;i<144;i++){
 const t=i/24;let anim='idle',at=t,label='READY';
 if(t>=1&&t<1.8){anim='attack';at=t-1;label=at<.29?'ANTICIPATION':at<.44?'IMPACT':'FOLLOW THROUGH';}
 else if(t>=2.3&&t<3.1){anim='skill';at=t-2.3;label='CAST';}
 else if(t>=3.6&&t<4){anim='hurt';at=t-3.6;label='HIT REACTION';}
 else if(t>=4.5){anim='dead';at=t-4.5;label='DEFEATED';}
 const g=c.createLinearGradient(0,0,0,640);g.addColorStop(0,'#09101d');g.addColorStop(1,'#203b46');c.fillStyle=g;c.fillRect(0,0,960,640);
 c.strokeStyle='#3b626a';c.lineWidth=1;for(let k=-8;k<10;k++){c.beginPath();c.moveTo(480+k*100,310);c.lineTo(480+k*210,640);c.stroke();}for(let y=350;y<640;y+=55){c.beginPath();c.moveTo(0,y);c.lineTo(960,y);c.stroke();}
 c.fillStyle='#0008';c.beginPath();c.ellipse(480,541,115,25,0,0,Math.PI*2);c.fill();
 drawHero(c,images,'sword-cockro',{anim,animTime:at,animDuration:.58,face:1},480,540,390);
 if(anim==='attack'&&at>=.29&&at<.5){const u=(at-.29)/.21;c.save();c.globalAlpha=1-u;c.strokeStyle='#d7fcff';c.lineWidth=3;for(let n=0;n<9;n++){const a=n*6.28/9;c.beginPath();c.moveTo(625+Math.cos(a)*15,435+Math.sin(a)*15);c.lineTo(625+Math.cos(a)*(30+60*u),435+Math.sin(a)*(30+60*u));c.stroke();}c.restore();}
 c.fillStyle='#e9e3ca';c.font='bold 25px sans-serif';c.fillText('COCKRO / COMBAT ANIMATION REVIEW',40,50);c.fillStyle='#87cddb';c.font='18px sans-serif';c.fillText('Experimental art • not a finished gameplay build',40,80);
 c.fillStyle='#effdff';c.font='bold 22px sans-serif';c.fillText(label,40,580);c.fillStyle='#76d5f3';c.fillRect(40,603,880*t/6,4);
 fs.writeFileSync(`review/frames/${String(i).padStart(4,'0')}.png`,canvas.toBuffer('image/png'));
}
