import {bountyBalance} from '../web/hunt-bounty.js';
// One surviving character save per playing account after single-character migration.
export function hunterStatistics(world){
 const records=new Map();
 let leader=null,refreshAfter=0;
 function record(id,state){
  if(!records.has(id))refreshAfter=0;
  records.set(id,{name:state.name,coins:state.stones});
 }
 function remove(id){records.delete(id);refreshAfter=0;}
 function view(player,now=Date.now()){
  if(now>=refreshAfter){
   leader=null;
   for(const [id,saved] of records){
    const live=world.getActor(id)?.s;
    const name=live?.name||saved.name,coins=live?.stones??saved.coins;
    if(!leader||coins>leader.coins||(coins===leader.coins&&name<leader.name))leader={name,coins};
   }
   refreshAfter=now+3000;
  }
  return {accounts:records.size,online:world.players.size,leader,
   heads:bountyBalance(player.s),revision:player.s.bountyRevision,coins:player.s.stones};
 }
 return {record,remove,view};
}
