// Offline experiment only. This key is never used by the live account or legacy save.
export const STORY_SAVE_KEY='cockro-story-test-v1';
export const STAGE={id:'kula-trail-1',name:'ร่องรอยแห่ง COCKRO',spawn:[.42,.93],exit:[.13,.055],
 path:[[.42,.93],[.54,.76],[.55,.66],[.48,.5],[.34,.39],[.34,.23],[.16,.12],[.13,.055]],
 encounters:[{id:'scout-1',uv:[.48,.84],level:1},{id:'scout-2',uv:[.54,.74],level:1},
 {id:'guard-1',uv:[.54,.63],level:2},{id:'guard-2',uv:[.46,.48],level:2},
 {id:'guard-3',uv:[.34,.35],level:3},{id:'guard-4',uv:[.30,.21],level:3},
 {id:'trail-boss',uv:[.16,.12],level:4,boss:true}]};
// Follow the visible dirt trail in the original Thung Kula tile, keeping its aspect ratio.
export function stageScene(image){
 const width=.06,walk=STAGE.path.slice(1).map((b,i)=>{const a=STAGE.path[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]),x=-(b[1]-a[1])/d*width,y=(b[0]-a[0])/d*width;
 return [[a[0]+x,a[1]+y],[b[0]+x,b[1]+y],[b[0]-x,b[1]-y],[a[0]-x,a[1]-y]];});
 for(const [x,y] of STAGE.path)walk.push([[x-width,y-width],[x+width,y-width],[x+width,y+width],[x-width,y+width]]);
 return {id:STAGE.id,name:STAGE.name,image,width:2400,height:2400,spawn:STAGE.spawn,walk,pois:[]};
}
export function progress(raw={}){const ids=new Set(STAGE.encounters.map(e=>e.id));return {
 defeated:[...new Set((Array.isArray(raw.defeated)?raw.defeated:[]).filter(id=>ids.has(id)))],
 claimed:raw.claimed===true&&STAGE.encounters.every(e=>raw.defeated?.includes(e.id))};}
export function defeat(state,id){if(!STAGE.encounters.some(e=>e.id===id)||state.defeated.includes(id))return false;state.defeated.push(id);return true;}
export function cleared(state){return STAGE.encounters.every(e=>state.defeated.includes(e.id));}
export function claim(state,save){if(!cleared(state)||state.claimed)return false;save.gold+=500;state.claimed=true;return true;}
export function encodeStory(save,state){return JSON.stringify({version:1,stage:STAGE.id,save,progress:progress(state)});}
export function decodeStory(raw,validate){if(!raw)return null;try{const v=JSON.parse(raw);if(v.version!==1||v.stage!==STAGE.id)return null;const save=validate(v.save);return save?{save,progress:progress(v.progress)}:null;}catch{return null;}}
