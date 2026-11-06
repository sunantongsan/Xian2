// Painted workshop companion, with a subtle furnace pulse rather than a flat placeholder.
export function drawForgeRobot(g,x,y,k,t,image){
 g.save();g.translate(x,y);g.scale(k,k);
 g.fillStyle='#04111d77';g.beginPath();g.ellipse(0,3,39,12,0,0,Math.PI*2);g.fill();
 g.strokeStyle='#e8b56b';g.lineWidth=1.5;g.beginPath();g.ellipse(0,3,43,13,0,0,Math.PI*2);g.stroke();
 if(image?.width)g.drawImage(image,-64,-182+Math.sin(t*1.5),128,192);
 g.fillStyle='#071c2eee';g.strokeStyle='#c9ac69';g.lineWidth=1;g.beginPath();g.roundRect(-66,-204,132,20,6);g.fill();g.stroke();g.fillStyle='#ffe3a3';g.font='bold 11px GameThai,sans-serif';g.textAlign='center';g.fillText('FORGE-09 • อัปเกรด',0,-190);g.restore();
}
