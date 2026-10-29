// The owner's supplied poses, kept verbatim. Prepare transparent runtime frames once,
// rather than asking an image model to redraw the anatomy.
export const CRICKET_WALK='heroes/cricket-walk-source.jpg';
const columns=[[0,314],[313,273],[550,255],[770,257],[1016,255],[1250,286]];
export function prepareCricketWalk(source){
 const atlas=document.createElement('canvas');atlas.width=6*384;atlas.height=2*384;const out=atlas.getContext('2d');
 for(let row=0;row<2;row++)for(let col=0;col<6;col++){
  const [left,width]=columns[col],top=row?470:50,height=row?363:375;
  const c=document.createElement('canvas');c.width=width;c.height=height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(source,left,top,width,height,0,0,width,height);
  const pixels=g.getImageData(0,0,width,height),a=pixels.data;
  // White JPEG background only; retain gold highlights and all colored armor pixels.
  for(let i=0;i<a.length;i+=4){const low=Math.min(a[i],a[i+1],a[i+2]);a[i+3]=low>248?0:low>225?Math.round((248-low)/23*255):255;}
  g.putImageData(pixels,0,0);const scale=320/height;
  out.drawImage(c,col*384+(384-width*scale)/2,row*384+352-height*scale,width*scale,height*scale);
 }
 return atlas;
}
