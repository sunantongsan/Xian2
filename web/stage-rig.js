import {leapScale} from './stage-motion.js';
import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Q=()=>new T.Quaternion();
export const ATTACK_DURATION=.88,ATTACK_IMPACT=.43,ATTACK_SWING_START=.33,ATTACK_SWING_END=.53;
const PALM=.065,SECOND_GRIP=-.18;
function boneMap(root){const b={};root.traverse(o=>{if(o.isBone)b[o.name.replace(/^mixamorig:?/,'')]=o;});return b;}
function orientWorld(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(q));b.updateWorldMatrix(false,true);}
function aim(b,end,target){const p=b.getWorldPosition(V()),from=end.getWorldPosition(V()).sub(p).normalize(),to=target.clone().sub(p).normalize();orientWorld(b,Q().setFromUnitVectors(from,to).multiply(b.getWorldQuaternion(Q())));}
// Analytic two-bone IK retains the original bone lengths and bends toward the pole.
function solve(upper,lower,end,target,pole){if(!upper||!lower||!end)return;const a=upper.getWorldPosition(V()),b=lower.getWorldPosition(V()),c=end.getWorldPosition(V()),l1=a.distanceTo(b),l2=b.distanceTo(c),axis=target.clone().sub(a),raw=axis.length(),d=T.MathUtils.clamp(raw,Math.abs(l1-l2)+.0001,l1+l2-.0001);axis.normalize();let bend=pole.clone().sub(a);bend.addScaledVector(axis,-bend.dot(axis)).normalize();const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));const elbow=a.clone().addScaledVector(axis,along).addScaledVector(bend,height);aim(upper,lower,elbow);aim(lower,end,a.clone().addScaledVector(axis,d));}
export function gripError(root){const b=boneMap(root),s=root.getObjectByName('MeleeSword');if(!s)return [];root.updateMatrixWorld(true);return ['Right','Left'].map((side,i)=>b[side+'Hand'].localToWorld(V(0,PALM,0)).distanceTo(s.localToWorld(V(0,i?SECOND_GRIP:0,0))));}
export function lockHands(root,b=boneMap(root),oneHand=false){
 const sword=root.getObjectByName('MeleeSword');if(!sword)return;root.updateWorldMatrix(true,true);const sq=sword.getWorldQuaternion(Q());
 // Keep both wrists within reach during run/roll blends without stretching the arms.
 for(let pass=0;pass<8;pass++){let corrected=false;for(const [side,grip,sign] of (oneHand?[['Right',0,1]]:[['Right',0,1],['Left',SECOND_GRIP,-1]])){const a=b[side+'Arm'],f=b[side+'ForeArm'],h=b[side+'Hand'];if(!a||!h)continue;const q=sq.clone().multiply(Q().setFromAxisAngle(V(1,0,0),sign*Math.PI/2)),target=sword.localToWorld(V(0,grip,0)).sub(V(0,PALM,0).applyQuaternion(q)),origin=a.getWorldPosition(V()),reach=origin.distanceTo(f.getWorldPosition(V()))+f.getWorldPosition(V()).distanceTo(h.getWorldPosition(V()))-.002,d=origin.distanceTo(target);if(d>reach){corrected=true;const p=sword.getWorldPosition(V()).add(origin.sub(target).multiplyScalar(1-reach/d));sword.position.copy(root.worldToLocal(p));sword.updateWorldMatrix(true,true);}}if(!corrected)break;}

 for(const [side,grip,sign] of (oneHand?[['Right',0,1]]:[['Right',0,1],['Left',SECOND_GRIP,-1]])){const h=b[side+'Hand'];if(!h)continue;const q=sq.clone().multiply(Q().setFromAxisAngle(V(1,0,0),sign*Math.PI/2));const target=sword.localToWorld(V(0,grip,0)).sub(V(0,PALM,0).applyQuaternion(q));const pole=root.localToWorld(V(side==='Right'?-.85:.85,.95,.1));solve(b[side+'Arm'],b[side+'ForeArm'],h,target,pole);orientWorld(h,q);}
}
export function equipSword(root){let sword=root.getObjectByName('MeleeSword');if(sword)return sword;sword=new T.Group();sword.name='MeleeSword';const mat=new T.MeshStandardMaterial({color:0xe2f7ff,metalness:.65,roughness:.25});// Tapered diamond cross-section: thin sharp edges at ±X, broad faces along ±Z.
const geo=new T.BufferGeometry(),vertices=[],indices=[];
for(const [y,w,d] of [[.15,.07,.023],[.95,.052,.018],[1.21,0,0]])vertices.push(-w,y,0,0,y,d,w,y,0,0,y,-d);
for(let ring=0;ring<2;ring++)for(let side=0;side<4;side++){const a=ring*4+side,b=ring*4+(side+1)%4,c=a+4,d=b+4;indices.push(a,b,c,b,d,c);}
geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const blade=new T.Mesh(geo,mat);blade.name='Blade';sword.add(blade);const grip=new T.Mesh(new T.CylinderGeometry(.036,.036,.36,8),new T.MeshStandardMaterial({color:0x553e37}));grip.position.y=-.12;sword.add(grip);const pommel=new T.Mesh(new T.SphereGeometry(.05,8,6),new T.MeshStandardMaterial({color:0xe9bd6a}));pommel.position.y=-.31;sword.add(pommel);const guard=new T.Mesh(new T.BoxGeometry(.31,.065,.09),new T.MeshStandardMaterial({color:0xffcb62,metalness:.5,roughness:.3}));guard.position.y=.14;sword.add(guard);sword.traverse(o=>{if(o.isMesh)o.castShadow=true});sword.position.set(-.03,1.18,.12);sword.quaternion.setFromEuler(new T.Euler(.7,-.22,0,'YXZ'));root.add(sword);return sword;}
// Shoulder carry, overhead anticipation, then cut down toward the hero's left (+X).
const keys=[
 [0,-.28,1.28,.24,0,-1.25,0,0,.015,0,0],
 [.16,-.26,1.43,.12,-.25,-.8,-.12,-.18,.04,-.06,-.02],
 [.30,-.18,1.58,.10,-.30,-.35,-.22,-.25,.07,-.09,-.04],
 [.35,-.12,1.56,.18,-.20,-.1,-.20,-.18,.06,-.04,0],
 [.43,.12,1.25,.48,.18,1.25,.08,.12,.025,.10,.14],
 [.54,.40,.86,.38,.35,2.15,.30,.35,.10,.18,.24],
 [.65,.34,.91,.28,.40,2.20,.28,.30,.07,.12,.18],
 [.76,.05,1.13,.28,.12,.55,.10,.12,.03,.04,.08],
 [.88,-.28,1.28,.24,0,-1.25,0,0,.015,0,0]
];
// A volume-preserving elastic silhouette, applied after hand constraints.
// Scale about the soles; both hands and the sword share this final deformation.
export function elasticScale(time){const weight=Math.sin(Math.PI*T.MathUtils.clamp(time/ATTACK_DURATION,0,1));const y=1-.018*weight;return V(1/Math.sqrt(y),y,1/Math.sqrt(y));}

// Shape-preserving cubic tangents avoid a full stop at every intermediate pose.
function sample(t){let i=0;while(i<keys.length-2&&keys[i+1][0]<t)i++;const a=keys[i],b=keys[i+1],h=b[0]-a[0],u=T.MathUtils.clamp((t-a[0])/h,0,1);
 const tangent=(n,j)=>{if(n===0||n===keys.length-1)return 0;const p=keys[n-1],q=keys[n],r=keys[n+1],d0=(q[j]-p[j])/(q[0]-p[0]),d1=(r[j]-q[j])/(r[0]-q[0]);return d0*d1<=0?0:2*d0*d1/(d0+d1);};
 return a.map((v,j)=>j===0?t:(2*u**3-3*u*u+1)*v+(u**3-2*u*u+u)*h*tangent(i,j)+(-2*u**3+3*u*u)*b[j]+(u**3-u*u)*h*tangent(i+1,j));}

// Local X is the cutting edge, Y is the blade, Z is the broad-face normal.
// Align X to the tip's velocity projected across Y, so cuts cannot slap flat-side first.
export function swordPose(t,name='Slash'){
 const k=sample(T.MathUtils.clamp(t,0,ATTACK_DURATION)),diagonal=name==='Sweep'?.65:name==='Cleave'?.08:-.55,angle=k[5];
 const direction=V(Math.sin(diagonal)*Math.cos(angle),Math.cos(diagonal)*Math.cos(angle),Math.sin(angle));
 const edge=V(-Math.sin(diagonal)*Math.sin(angle),-Math.cos(diagonal)*Math.sin(angle),Math.cos(angle));
 const position=V(-.28+Math.sin(diagonal)*(k[2]-1.28),1.36+Math.cos(diagonal)*(k[2]-1.28),k[3]-.12);
 const normal=edge.clone().cross(direction).normalize();
 return {position,quaternion:Q().setFromRotationMatrix(new T.Matrix4().makeBasis(edge,direction,normal))};
}

export function meleeClips(g){const idle=g.animations.find(c=>c.name==='Idle');if(!idle)return [];const root=g.scene,bones=boneMap(root),sword=root.getObjectByName('MeleeSword');if(!sword)return [];const mixer=new T.AnimationMixer(root);mixer.clipAction(idle).play();mixer.setTime(0);root.updateMatrixWorld(true);const rest=[];root.traverse(o=>rest.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()}));const feet={};for(const side of ['Left','Right'])feet[side]=bones[side+'Foot'].getWorldPosition(V());
 const restore=()=>{for(const b of rest){b.o.position.copy(b.p);b.o.quaternion.copy(b.q);b.o.scale.copy(b.s);}root.updateMatrixWorld(true);};
 const rotate=(name,x,y,z=0)=>{const b=bones[name];if(b)orientWorld(b,Q().setFromEuler(new T.Euler(x,y,z,'YXZ')).multiply(b.getWorldQuaternion(Q())));};
 const move=(b,delta)=>{const p=b.getWorldPosition(V()).add(delta);b.position.copy(b.parent.worldToLocal(p));root.updateMatrixWorld(true);};
 function make(name){const duration=name==='Roll'?.64:ATTACK_DURATION,times=Array.from({length:Math.round(duration*60)+1},(_,i)=>i*duration/Math.round(duration*60)),values=idle.tracks.map(()=>[]),sp=[],sq=[];
 for(const t of times){restore();const k=sample(name==='Guard'?0:t),[_,x,y,z,yaw,tilt,hip,chest,crouch,lean,step]=k;
 if(name==='Roll'){const f=Math.sin(t/duration*Math.PI);for(const [n,a] of Object.entries({Spine:[.65,0,0],Spine1:[.4,0,0],Head:[.3,0,0],LeftUpLeg:[-1.3,0,0],RightUpLeg:[-1.3,0,0],LeftLeg:[1.8,0,0],RightLeg:[1.8,0,0]}))if(bones[n])bones[n].quaternion.multiply(Q().setFromEuler(new T.Euler(...a.map(v=>v*f))));sword.position.set(0,1.02,.18);sword.quaternion.setFromEuler(new T.Euler(.5,0,0));}
 else{
 move(bones.Hips,V(hip*.06,-crouch,step*.2));rotate('Hips',lean*.22,hip);rotate('Spine',lean*.35,chest*.30);rotate('Spine1',lean*.25,chest*.30);rotate('Spine2',lean*.18,chest*.40);rotate('Neck',-lean*.25,-(hip+chest)*.45);rotate('Head',-lean*.2,-(hip+chest)*.25);
 for(const side of ['Left','Right']){const foot=feet[side].clone();foot.x=side==='Left'?.23:-.23;foot.z+=side==='Left'?step:-step*.15;const lift=side==='Left'?Math.max(0,Math.sin(T.MathUtils.clamp((t-.31)/.23,0,1)*Math.PI))*.055:0;foot.y+=lift;solve(bones[side+'UpLeg'],bones[side+'Leg'],bones[side+'Foot'],foot,root.localToWorld(V(side==='Left'?.3:-.3,.5,.8)));}
 const pose=swordPose(name==='Guard'?0:t,name);sword.position.copy(pose.position);sword.quaternion.copy(pose.quaternion);
 }
 root.updateMatrixWorld(true);lockHands(root,bones,name==='Guard');
 for(const [n,b] of Object.entries(bones))if(/Hand(Index|Middle|Ring|Pinky)[123]$/.test(n))b.quaternion.multiply(Q().setFromEuler(new T.Euler(.8,0,0)));
 for(let i=0;i<idle.tracks.length;i++){const tr=idle.tracks[i],p=tr.name.lastIndexOf('.'),o=root.getObjectByName(tr.name.slice(0,p)),prop=tr.name.slice(p+1);values[i].push(...(o&&o[prop]?.toArray?o[prop].toArray():Array.from(tr.values.slice(0,tr.getValueSize()))));}sp.push(...sword.position);sq.push(...sword.quaternion);
 }
 return new T.AnimationClip(name,duration,[...idle.tracks.map((tr,i)=>new tr.constructor(tr.name,times,values[i])),new T.VectorKeyframeTrack('MeleeSword.position',times,sp),new T.QuaternionKeyframeTrack('MeleeSword.quaternion',times,sq)]);
 }
 const clips=['Slash','Sweep','Cleave','Roll','Guard'].map(make);mixer.stopAllAction();mixer.uncacheRoot(root);restore();return clips;
}
export function actor(g){const visual=g.scene,isHero=g.animations.some(c=>c.name==='Shoot');if(isHero)equipSword(visual);const bones=boneMap(visual),clips=[...g.animations,...meleeClips(g)],root=isHero?new T.Group():visual;if(isHero){root.name='ElasticHero';root.add(visual);}const mixer=new T.AnimationMixer(visual),actions={};for(const c of clips)actions[c.name]=mixer.clipAction(c);let current='',clock=0,flinch=0;
const constrain=()=>{if(!isHero)return;root.scale.setScalar(1);root.updateMatrixWorld(true);if(!root.userData.ranged){const carry=['Guard','Idle','Walk','Run'].includes(current);if(carry){const sword=visual.getObjectByName('MeleeSword');sword.position.set(-.28,1.36,.12);sword.quaternion.copy(swordPose(0).quaternion);}lockHands(visual,bones,carry);}const t=actions[current]?.time||0;if(current==='Slash'||current==='Sweep'||current==='Cleave')root.scale.copy(elasticScale(t));else if(current==='Run'){const y=1+Math.sin(clock*17)*.10;root.scale.set(1/Math.sqrt(y),y,1/Math.sqrt(y));}else if(current==='Roll'||current==='Shoot'){const y=current==='Roll'?leapScale(Math.min(1,t/.64)):1-.12*Math.sin(Math.min(1,t/.36)*Math.PI);root.scale.set(1/Math.sqrt(y),y,1/Math.sqrt(y));}else if(current==='Guard'||current==='Idle'){const breath=.78*Math.sin(clock*2.65)+.22*Math.sin(clock*5.3-.6);const y=1+breath*.018;root.scale.set(1/Math.sqrt(y),y,1/Math.sqrt(y));}if(flinch>0){const age=.26-flinch;const y=1-.25*Math.exp(-age*12)*Math.cos(age*26);root.scale.x/=Math.sqrt(y);root.scale.z/=Math.sqrt(y);root.scale.y*=y;}
 root.updateMatrixWorld(true);};
return {root,mixer,actions,react(){flinch=.26;constrain();},play(name,once=false){if(root.userData.ranged){if(name==='Slash'||name==='Cleave')name='Shoot';else if(name==='Guard')name='Idle';}if(current===name&&!once)return;const next=actions[name];if(!next)return;const old=actions[current];next.reset().setLoop(once?T.LoopOnce:T.LoopRepeat,once?1:Infinity);next.clampWhenFinished=once;next.play();if(old&&old!==next)next.crossFadeFrom(old,name==='Roll'?.04:.08,false);current=name;},update(dt){clock+=dt;flinch=Math.max(0,flinch-dt);mixer.update(dt);constrain();},seek(t){clock=t;mixer.setTime(t);constrain();}};}

