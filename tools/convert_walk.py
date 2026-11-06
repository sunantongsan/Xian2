"""Bake a short actual CMU walk into a compact cyclic joint track (no runtime BVH parser)."""
from pathlib import Path
import re,json,numpy as np
from scipy.spatial.transform import Rotation
base=Path(__file__).resolve().parents[1]
text=(base/'tools/mocap/07_01.bvh').read_text();hier,motion=text.split('MOTION');tokens=re.findall(r'[{}]|[^\s{}]+',hier);pos=1;nodes=[];channels=0

def node(parent=-1):
 global pos,channels
 kind=tokens[pos];pos+=1
 if kind=='End':pos+=1;name=nodes[parent]['name']+'End'
 else:name=tokens[pos];pos+=1
 assert tokens[pos]=='{';pos+=1
 item={'name':name,'parent':parent,'offset':None,'channels':[],'start':channels};idx=len(nodes);nodes.append(item)
 while tokens[pos]!='}':
  key=tokens[pos]
  if key=='OFFSET':item['offset']=np.array(list(map(float,tokens[pos+1:pos+4])));pos+=4
  elif key=='CHANNELS':
   n=int(tokens[pos+1]);item['channels']=tokens[pos+2:pos+2+n];item['start']=channels;channels+=n;pos+=2+n
  else:node(idx)
 pos+=1
node();lines=motion.strip().splitlines();dt=float(lines[1].split(':')[1]);data=np.array([list(map(float,l.split())) for l in lines[2:] if l.strip()]);frames=[]
for row in data:
 mats=[];points=[]
 for n in nodes:
  vals=row[n['start']:n['start']+len(n['channels'])];p=n['offset'].copy();R=np.eye(3)
  for ch,val in zip(n['channels'],vals):
   axis='XYZ'.index(ch[0])
   if ch.endswith('position'):p[axis]+=val
   else:
    v=np.zeros(3);v[axis]=np.radians(val);R=R@Rotation.from_rotvec(v).as_matrix()
  if n['parent']>=0:
   pr,pp=mats[n['parent']];p=pp+pr@p;R=pr@R
  mats.append((R,p));points.append(p)
 frames.append(points)
a=np.array(frames);names=[n['name'] for n in nodes];idx={n:i for i,n in enumerate(names)}
root=a[:,idx['Hips']];forward=root[-1]-root[1];forward[1]=0;forward/=np.linalg.norm(forward);right=np.cross([0,1,0],forward)
feet=a[1:,[idx['LeftToeBase'],idx['RightToeBase']],1];floor=float(np.percentile(feet,4));height=float(np.median(a[1:,idx['HeadEnd'],1])-floor)
local=a.copy();local[:,:,0]-=root[:,None,0];local[:,:,2]-=root[:,None,2];local[:,:,1]-=floor
canonical=np.stack([local@right,local[:,:,1],local@forward],axis=-1)/height
selection=['Hips','Spine','Spine1','Neck1','Head','HeadEnd','LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase','LeftToeBaseEnd','RightUpLeg','RightLeg','RightFoot','RightToeBase','RightToeBaseEnd','LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand']
a=canonical[:,[idx[n] for n in selection]]
# Select matching whole-body poses separated by a plausible natural full gait cycle.
best=None
for period in range(100,155):
 for start in range(8,len(a)-period-8):
  error=np.mean((a[start]-a[start+period])**2)+np.mean(((a[start+2]-a[start-2])-(a[start+period+2]-a[start+period-2]))**2)*.5
  if best is None or error<best[0]:best=(error,start,period)
error,start,period=best
track=a[start:start+period+1].copy()
# Distribute only the measured loop mismatch across the cycle, preserving captured motion.
mismatch=track[-1]-track[0]
for f in range(len(track)):track[f]-=mismatch*(f/period)
N=64;result=[]
for f in np.linspace(0,period,N,endpoint=False):
 lo=int(f);u=f-lo;result.append(track[lo]*(1-u)+track[min(lo+1,period)]*u)
stride=float(np.dot(root[start+period]-root[start],forward)/height*110)
# Preserve original segment lengths when interpolating the corrected loop at runtime.
bones=[]
for side in ['Left','Right']:
 for parent,child in [('UpLeg','Leg'),('Leg','Foot'),('Foot','ToeBase'),('ToeBase','ToeBaseEnd'),('Arm','ForeArm'),('ForeArm','Hand')]:
  p,c=side+parent,side+child
  length=float(np.median(np.linalg.norm(a[:,selection.index(c)]-a[:,selection.index(p)],axis=1)))
  bones.append([p,c,round(length,8)])
out={'source':'CMU Graphics Lab 07_01; Bruce Hahne BVH conversion','duration':round(period*dt,5),'cycleDistance':round(stride,5),'sourceFrames':[start,start+period],'jointNames':selection,'bones':bones,'frames':np.round(result,6).tolist()}
(base/'tools/mocap/walk-capture.js').write_text('// Derived from CMU walking capture 07_01. Credits: assets/MOTION-LICENSE.txt\nexport const WALK_CAPTURE='+json.dumps(out,separators=(',',':'))+';\n')
(base/'tools/mocap/walk-analysis.json').write_text(json.dumps({'source_dt':dt,'source_frames':len(data),'height':height,'floor':floor,'forward':forward.tolist(),'best_loop_error':float(error),'seam_max_distance':float(np.max(np.linalg.norm(mismatch,axis=1))),'cycle_frames':period,'duration':out['duration'],'cycle_distance':stride},indent=2))
print((base/'tools/mocap/walk-analysis.json').read_text())
print('Joint heights frame mid:',{n:np.round(a[start+period//2,i],3).tolist() for i,n in enumerate(selection)})
