// Own one animation request, including across repeated Android pause/resume events.
export function createFrameLoop(render,{request=requestAnimationFrame,cancel=cancelAnimationFrame}={}){
 let id=null,running=false,previous=null;
 // A thrown frame must never stop the loop (that froze the game after a reward).
 function frame(now){id=null;if(!running)return;const dt=previous===null?0:Math.min((now-previous)/1000,.05);previous=now;try{render(now,dt);}catch(error){console.error(error);}finally{if(running&&id===null)id=request(frame);}}
 return {start(){if(running)return;running=true;previous=null;id=request(frame);},stop(){running=false;previous=null;if(id!==null)cancel(id);id=null;},get running(){return running;}};
}
