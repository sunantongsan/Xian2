import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../web/vendor/three.module.js';import {swordPose,elasticScale} from '../web/stage-rig.js';
test('all three cuts lead with an edge rather than the broad face, with continuous recovery',()=>{
 for(const mode of ['Slash','Sweep','Cleave']){let previous;
  for(let time=0;time<.88;time+=.005){const p=swordPose(time,mode);if(previous)assert(previous.angleTo(p.quaternion)<.16,'wrist snaps '+mode+' '+time);previous=p.quaternion;assert(Math.abs(elasticScale(time).y-1)<.025);
   if(time<.33||time>.53)continue;
   const tip=t=>{const a=swordPose(t,mode);return new T.Vector3(0,1.1,0).applyQuaternion(a.quaternion).add(a.position);};
   const velocity=tip(time+.001).sub(tip(time-.001)).normalize(),normal=new T.Vector3(0,0,1).applyQuaternion(p.quaternion);
   assert(Math.abs(normal.dot(velocity))<.001,'broad face leads '+mode);
  }
 }
});
