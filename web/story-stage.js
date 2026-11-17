import {xpNeed,advanceLevels} from './core.js';
import {pendingMutation} from './mutation.js';
export const STORY_SAVE_KEY='cockro-story-test-v1';
const routes=[
 [[.42,.93],[.54,.76],[.55,.66],[.48,.5],[.34,.39],[.34,.23],[.16,.12],[.13,.055]],
 [[.055,.50],[.20,.56],[.34,.53],[.48,.5],[.65,.41],[.73,.41],[.93,.49]],
 [[.42,.93],[.54,.76],[.55,.66],[.48,.5],[.65,.41],[.73,.41],[.93,.49]]
];
const chapters=['รอยเท้านักสำรวจ','เสบียงที่หายไป','เกราะแห่งทุ่งกุลา','แผนที่ฉีกขาด','แสงจากปีกแก้ว','ประตูสู่ COCKRO'];
const names=['ออกจากเมือง','สมุนไพรริมทาง','ฝูงแมลงขวางทาง','เสบียงตกหล่น','ผู้เฝ้าทาง',
 'ตามรอยคาราวาน','ชิ้นส่วนเครื่องนำทาง','ทางแยกอันตราย','กล่องเสบียงคาราวาน','จ่าฝูงผู้ปล้นเสบียง',
 'รอยเกราะโบราณ','ผลึกซ่อมเกราะ','แนวป้องกันแมลง','บันทึกช่างเกราะ','ผู้พิทักษ์เกราะ',
 'เส้นทางที่ถูกลืม','แผนที่ส่วนแรก','ฝูงเฝ้าแผนที่','แผนที่ส่วนสุดท้าย','ผู้เฝ้าหอจดหมายเหตุ',
 'ตามแสงปีกแก้ว','เศษปีกเรืองแสง','ทางผ่านฝูงพิษ','ผลึกเปิดทาง','ราชินีปีกแก้ว',
 'ก่อนถึงประตูสมบัติ','ตราประตูชิ้นแรก','ฝ่าด่านผู้พิทักษ์','ตราประตูชิ้นสุดท้าย','ผู้เฝ้าประตู COCKRO'];
const items=['สมุนไพร','กล่องเสบียง','ชิ้นส่วนเครื่องนำทาง','กล่องเสบียง','ผลึกซ่อมเกราะ','บันทึกช่างเกราะ','ชิ้นส่วนแผนที่','ชิ้นส่วนแผนที่','เศษปีกแก้ว','ผลึกเปิดทาง','ตราประตู','ตราประตู'];
function pointAt(path,t){const k=t*(path.length-1),i=Math.min(path.length-2,Math.floor(k)),f=k-i;return path[i].map((v,n)=>v+(path[i+1][n]-v)*f);}
export const STAGES=Array.from({length:30},(_,i)=>{
 const n=i+1,chapter=Math.floor(i/5),kind=n%5===0?'boss':[2,4].includes(n%5)?'collect':'hunt';
 const route=routes[i%3],path=(Math.floor(i/3)%2?[...route].reverse():route).map(p=>[...p]);
 const min=n*2-1,max=n*2,count=6+Math.floor(i/5),item=kind==='collect'?items[chapter*2+(n%5===4?1:0)]:null;
 const encounters=Array.from({length:count},(_,j)=>({id:`s${n}-m${j}`,uv:pointAt(path,.14+j/(count-1)*.69),level:j%2?max:min,boss:false}));
 if(kind==='boss')encounters.push({id:`s${n}-boss`,uv:pointAt(path,.90),level:max,boss:true});
 return {id:n,name:names[i],chapter:chapters[chapter],kind,min,max,path,spawn:path[0],exit:path.at(-1),encounters,item,
  treasure:pointAt(path,.57),objects:kind==='collect'?Array.from({length:3+Math.floor(i/10)},(_,j)=>({id:`s${n}-item${j}`,uv:pointAt(path,.22+j/(2+Math.floor(i/10))*.57)})):[],
  gold:700+n*180,alloy:3+Math.floor(n/5),protect:n>=5?1:0};
});
export const getStage=n=>STAGES[Number(n)-1]||null;
export function stageScene(stage,image){const width=.065,walk=stage.path.slice(1).map((b,i)=>{const a=stage.path[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]),x=-(b[1]-a[1])/d*width,y=(b[0]-a[0])/d*width;return [[a[0]+x,a[1]+y],[b[0]+x,b[1]+y],[b[0]-x,b[1]-y],[a[0]-x,a[1]-y]];});
 for(const [x,y]of stage.path)walk.push([[x-width,y-width],[x+width,y-width],[x+width,y+width],[x-width,y+width]]);
 return {id:'story-'+stage.id,name:stage.name,image,width:2400,height:2400,spawn:stage.spawn,walk,pois:[]};}
const unique=(a,valid)=>[...new Set((Array.isArray(a)?a:[]).filter(valid))];
export function progress(raw={}){
 // Unlocks are derived from a contiguous clear history, not a trusted counter.
 const prior=unique(raw.cleared,n=>Number.isInteger(n)&&n>=1&&n<=30);const done=[];
 for(let n=1;n<=30&&prior.includes(n);n++)done.push(n);
 const unlocked=Math.min(30,done.length+1),st=getStage(raw.active?.stage);
 let active=null;
 if(st&&st.id<=unlocked){active={stage:st.id,defeated:unique(raw.active.defeated,id=>st.encounters.some(e=>e.id===id)),found:unique(raw.active.found,id=>st.objects.some(e=>e.id===id)),complete:false,treasure:raw.active.treasure===true};active.complete=raw.active.complete===true&&runReady({active});}
 return {unlocked,cleared:done,active,tutorial:Number.isInteger(raw.tutorial)?Math.max(0,Math.min(6,raw.tutorial)):(done.length?6:active?2:0),location:raw.location==='stage'&&active&&!active.complete?'stage':'town'};
}
export function begin(state,n){const stage=getStage(n);if(!stage||stage.id>state.unlocked||state.active?.complete)return false;
 if(state.active?.stage!==stage.id)state.active={stage:stage.id,defeated:[],found:[],complete:false,treasure:false};
 state.location='stage';return true;}
export function defeat(state,id){const r=state.active,st=getStage(r?.stage);if(!r||r.complete||!st.encounters.some(e=>e.id===id)||r.defeated.includes(id))return false;r.defeated.push(id);return true;}
export function collect(state,id){const r=state.active,st=getStage(r?.stage);if(!r||r.complete||!st.objects.some(e=>e.id===id)||r.found.includes(id))return false;r.found.push(id);return true;}
export function runReady(state){const r=state.active,st=getStage(r?.stage);return !!st&&st.encounters.every(e=>r.defeated.includes(e.id))&&st.objects.every(e=>r.found.includes(e.id));}
export function finish(state){if(!runReady(state)||state.active.complete)return false;state.active.complete=true;state.location='town';return true;}
export function rewardPreview(state){const stage=getStage(state.active?.stage);if(!stage||!state.active.complete)return null;const first=!state.cleared.includes(stage.id);return {stage:stage.id,first,gold:Math.floor(stage.gold*(first?1:.25)),alloy:first?stage.alloy:1,protect:first?stage.protect:0};}
export function claim(state,save){const gift=rewardPreview(state);if(!gift)return null;
 save.gold=Math.min(1e10,save.gold+gift.gold);save.upgradeItems.alloy=Math.min(99999,save.upgradeItems.alloy+gift.alloy);save.upgradeItems.protect=Math.min(99999,save.upgradeItems.protect+gift.protect);
 if(gift.first){state.cleared.push(gift.stage);state.unlocked=Math.min(30,state.cleared.length+1);
  const target=Math.min(60,gift.stage*2+1);while(save.level<target&&!pendingMutation(save)){save.xp=xpNeed(save.level);advanceLevels(save);}}
 state.active=null;state.location='town';return gift;
}
export function storyMonster(stage,encounter,catalog){const e=encounter,template=catalog.find(m=>m.id===(e.boss?1060+Math.floor((e.level-1)/10):1000+e.level-1));
 return {...template,level:e.level,boss:e.boss,hp:Math.round((70+e.level*16+e.level*e.level*.12)*(e.boss?3.5:1)),damage:Math.round((5+e.level*.9+e.level*e.level*.012)*(e.boss?1.5:1)),xp:20+e.level*8,gold:10+e.level*3};}
export function encodeStory(save,state){return JSON.stringify({version:2,save,progress:progress(state)});}
export function decodeStory(raw,validate){if(!raw)return null;try{const v=JSON.parse(raw);if(![1,2].includes(v.version))return null;const save=validate(v.save);return save?{save,progress:v.version===1?progress():progress(v.progress)}:null;}catch{return null;}}
