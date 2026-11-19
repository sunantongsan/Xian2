// Canvas-only gestures leave every menu, skill and chat control independent.
export function bindWorldInput(canvas,{enabled,tap,steer,stop,getZoom,zoom}){
 const pointers=new Map();let gesture=null,pinch=null;
 const cancel=()=>{pointers.clear();gesture=null;pinch=null;stop();};
 const distance=()=>{const[a,b]=[...pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
 canvas.addEventListener('pointerdown',e=>{
  if(!enabled()||e.button>0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1)gesture={id:e.pointerId,x:e.clientX,y:e.clientY,drag:false,cancelled:false};
  if(pointers.size===2){gesture.cancelled=true;pinch={distance:Math.max(1,distance()),zoom:getZoom()};stop(true);}
 });
 canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;if(!enabled()){cancel();return;}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size>=2&&pinch){zoom(Math.max(.45,Math.min(1.5,pinch.zoom*distance()/pinch.distance)));return;}
  if(!gesture||gesture.cancelled||gesture.id!==e.pointerId)return;
  const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y,d=Math.hypot(dx,dy);if(d>8)gesture.drag=true;if(!gesture.drag)return;
  const strength=Math.min(1,d/55);steer(e.pointerId,d?dx/d*strength:0,d?dy/d*strength:0);
 });
 const end=e=>{if(!pointers.has(e.pointerId))return;const shouldTap=enabled()&&e.type==='pointerup'&&gesture&&!gesture.drag&&!gesture.cancelled&&pointers.size===1;pointers.delete(e.pointerId);stop();if(!pointers.size){gesture=null;pinch=null;}else if(gesture)gesture.cancelled=true;if(shouldTap)tap(e);};
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,end);
 canvas.addEventListener('wheel',e=>{if(!enabled())return;e.preventDefault();zoom(Math.max(.45,Math.min(1.5,getZoom()*Math.exp(-e.deltaY*.001))));},{passive:false});
 return {cancel};
}
