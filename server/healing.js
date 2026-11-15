import {maxHP,combatStats} from '../web/core.js';
export function castHealing(world,p,k,now){
 const max=maxHP(p.s);if(p.hp<=0||p.hp>=max||now<p.actionUntil||now<(p.cd[k.id]||0)||p.mp<k.mp)return false;
 p.mp-=k.mp;p.cd[k.id]=now+k.cd;p.actionUntil=now+.5;p.actionKind='skill';p.anim='skill';p.animTime=0;p.castId=k.id;
 p.hp=Math.min(max,p.hp+max*.22*combatStats(p.s).spell);p.dirty=true;
 world.event(p,{kind:'skill',hero:p.s.hero,skillId:k.id,form:'circle',aim:{x:p.x,y:p.y},color:'#a4ffd0',radius:120,range:120});return true;
}
