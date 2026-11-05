// Replays only locally sent movement after the server's acknowledged position.
export class MoveHistory {
 constructor(){this.reset();}
 reset(){this.moves=[];this.anchor=null;}
 sent(move){this.moves.push({...move});if(this.moves.length>64)this.moves.shift();}
 target(player,self,trace){
  if(self.correction){this.reset();return {x:self.x,y:self.y};}
  if(!Number.isSafeInteger(self.moveAck))return {x:self.x,y:self.y};
  const ack=this.moves.find(m=>m.seq===self.moveAck)|| (this.anchor?.seq===self.moveAck?this.anchor:null);
  if(!ack)return {x:self.x,y:self.y};
  this.anchor=ack;this.moves=this.moves.filter(m=>m.seq>self.moveAck);
  let result={x:self.x,y:self.y},last=ack;
  for(const next of [...this.moves,player]){result=trace(result,{x:result.x+next.x-last.x,y:result.y+next.y-last.y});last=next;}
  return result;
 }
}
