import {World} from './world.js';

export class PrivateSessions {
 constructor({maxPlayers,testRewards,goldEvent,economy=null}){
  this.players=new Map();
  this.sessions=new Map();
  this.maxPlayers=maxPlayers;
  this.options={maxPlayers,testRewards,goldEvent,economy,onlineCount:()=>this.players.size};
  const template=new World(this.options);
  this.maps=template.maps;
  this.mobs=template.mobs;
 }
 join(id,save){
  if(this.players.has(id))throw Error('already_online');
  if(this.players.size>=this.maxPlayers)throw Error('room_full');
  const session=new World(this.options),player=session.join(id,save);
  this.sessions.set(id,session);
  this.players.set(id,player);
  return player;
 }
 getActor(id){return this.players.get(id);}
 actors(){return this.players.values();}
 snapshot(player){return this.sessions.get(player.id).snapshot(player);}
 command(player,command){this.sessions.get(player.id).command(player,command);}
 tick(dt,now){for(const session of this.sessions.values())session.tick(dt,now);}
 disconnect(player){
  if(this.getActor(player.id)!==player)return;
  this.sessions.get(player.id).disconnect(player);
  this.sessions.delete(player.id);
  this.players.delete(player.id);
 }
}
