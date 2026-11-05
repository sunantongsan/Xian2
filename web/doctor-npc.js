// Four registered greeting poses; the shadow and label stay stable while the hand waves.
export function drawDoctor(g,x,y,k,t,ready=false,image){
 g.save();g.translate(x,y);g.scale(k,k);
 g.fillStyle='#04111d77';g.beginPath();g.ellipse(0,2,32,10,0,0,Math.PI*2);g.fill();
 g.strokeStyle=ready?'#f3d38c':'#79dcf2';g.lineWidth=1.5;g.beginPath();g.ellipse(0,2,38,12,0,0,Math.PI*2);g.stroke();
 if(image?.width){const sequence=[0,1,0,2,3,2],frame=sequence[Math.floor(t*3)%sequence.length],w=image.width/2,h=image.height/2;g.drawImage(image,frame%2*w,Math.floor(frame/2)*h,w,h,-91,-177,182,182);}
 g.fillStyle='#071c2eee';g.strokeStyle='#c9ac69';g.lineWidth=1;g.beginPath();g.roundRect(-62,-199,124,20,6);g.fill();g.stroke();g.fillStyle='#fff0ba';g.font='bold 12px GameThai,sans-serif';g.textAlign='center';g.fillText('ดร.ไอสไตร์',0,-185);
 if(ready){g.fillStyle='#ffe091';g.font='bold 20px sans-serif';g.fillText('✧',0,-207+Math.sin(t*3)*3);}g.restore();
}
