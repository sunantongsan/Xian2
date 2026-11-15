import bpy,math,os,sys,json
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector,Quaternion
ROOT=os.path.abspath(sys.argv[sys.argv.index('--root')+1]) if '--root' in sys.argv else os.getcwd()
bpy.ops.wm.open_mainfile(filepath=ROOT+'/output/COCKRO-Human-Walk.blend')
s=bpy.context.scene;a=next(o for o in bpy.data.objects if o.type=='ARMATURE');a.animation_data_clear()
for b in a.pose.bones:b.rotation_mode='QUATERNION'
s.render.resolution_x=128;s.render.resolution_y=128;s.render.resolution_percentage=100;s.cycles.samples=4;s.cycles.use_denoising=False;s.render.use_persistent_data=True;s.render.film_transparent=True
s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA'
c=s.camera;c.data.ortho_scale=2.5;center=Vector((0,0,.85));dirs=['S','SW','W','NW','N','NE','E','SE'];rest={b.name:b.head_local.copy() for b in a.data.bones};counts={'walk':32,'idle':12,'attack':16,'skill':16,'hurt':8,'dead':12}
def rot(n,x=0,y=0,z=0):a.pose.bones[n].rotation_quaternion=Quaternion((0,1,0),y)@Quaternion((0,0,1),z)@Quaternion((1,0,0),x)
def pose(kind,u):
 for b in a.pose.bones:b.rotation_quaternion=Quaternion();b.location=(0,0,0);b.scale=(1,1,1)
 hip=a.pose.bones['hip'];rot('lForearmBend',-.12);rot('rForearmBend',-.12)
 if kind=='walk':
  theta=math.tau*u;hip.location.y=-12-2*math.cos(2*theta)
  bpy.context.view_layer.update()
  for side,offset,sign in [('l',0,1),('r',.5,-1)]:
   phase=(u+offset)%1
   if phase<.6:z=42-84*phase/.6;lift=0
   else:
    q=(phase-.6)/.4;z=-42+84*(q*q*(3-2*q));lift=16*math.sin(math.pi*q)**1.3
   names=[side+'ThighBend',side+'Shin',side+'Foot'];upper,knee,foot=[a.pose.bones[n] for n in names]
   h=upper.head.copy();goal=Vector((sign*14,rest[names[2]].y+lift,rest[names[2]].z+z))
   v1=rest[names[1]]-rest[names[0]];v2=rest[names[2]]-rest[names[1]];L1,L2=v1.length,v2.length
   dv=goal-h;dist=min(dv.length,L1+L2-.01);d=dv.normalized();front=Vector((0,0,1));bend=(front-d*front.dot(d)).normalized()
   along=(L1*L1-L2*L2+dist*dist)/(2*dist);height=math.sqrt(max(0,L1*L1-along*along));k=h+d*along+bend*height
   q1=v1.rotation_difference(k-h);q2=v2.rotation_difference(goal-k)
   upper.rotation_quaternion=q1;knee.rotation_quaternion=q1.inverted()@q2;foot.rotation_quaternion=q2.inverted()
   rot(side+'ShldrBend',.62*math.cos(math.tau*phase));rot(side+'ForearmBend',-.20-.15*max(0,-math.cos(math.tau*phase)))
 elif kind=='idle':rot('chestLower',.012*math.sin(u*math.tau));rot('lShldrBend',.03);rot('rShldrBend',-.025)
 elif kind in ['attack','skill']:
  # Anticipation, contact and recovery are real rig poses, not translated images.
  strike=max(0,math.sin(math.pi*min(1,max(0,(u-.25)/.55))))
  wind=math.sin(math.pi*min(1,u/.3)) if u<.3 else 0
  if kind=='attack':
   rot('abdomenLower',.16*strike-.10*wind,y=-.18*wind+.25*strike)
   rot('chestUpper',.08*strike,y=.20*strike)
   rot('rShldrBend',.40*wind-1.60*strike,z=.12*strike);rot('rForearmBend',-.65*wind-.18*strike)
   rot('lShldrBend',-.40*wind+.32*strike);rot('lForearmBend',-.6)
  else:
   rot('abdomenLower',-.12*wind+.12*strike)
   rot('lShldrBend',-1.9*strike-.4*wind,z=-.25*strike);rot('rShldrBend',-1.9*strike-.4*wind,z=.25*strike)
   rot('lForearmBend',-.5*wind-.3*strike);rot('rForearmBend',-.5*wind-.3*strike)
  hip.location.y=-2.5*wind+1.5*strike;a.pose.bones['chestLower'].scale=(1-.025*strike,1+.055*strike,1-.025*strike)
 elif kind=='hurt':
  k=math.sin(math.pi*u);rot('abdomenLower',-.3*k);rot('neckLower',-.15*k);rot('lShldrBend',-.4*k);rot('rShldrBend',-.4*k);hip.location.y=-3*k
 elif kind=='dead':
  k=u*u*(3-2*u);rot('hip',-1.5*k);hip.location.y=-92*k;hip.location.z=-10*k
  rot('lShldrBend',-.25*k,z=.35*k);rot('rShldrBend',-.25*k,z=-.35*k);rot('lShin',.18*k);rot('rShin',.12*k)
 bpy.context.view_layer.update()
metadata='--metadata' in sys.argv;meta={}
preview='--preview' in sys.argv
out=ROOT+'/work/human-actions/'+('preview-v2' if preview else 'frames');os.makedirs(out,exist_ok=True)
for d,name in enumerate(dirs):
 if preview and name not in ['S','E']:continue
 ang=d*math.pi/4;c.location=center+Vector((4*math.sin(ang),-4*math.cos(ang),2.0));c.rotation_euler=(center-c.location).to_track_quat('-Z','Y').to_euler()
 for kind,n in counts.items():
  c.data.ortho_scale=3.4 if kind=='dead' else 2.5;center=Vector((0,0,.4 if kind=='dead' else .85));c.location=center+Vector((4*math.sin(ang),-4*math.cos(ang),2.0));c.rotation_euler=(center-c.location).to_track_quat('-Z','Y').to_euler()
  for f in range(n):
   if preview and f not in [0,n//2,n-1]:continue
   u=f/n if kind in ['idle','walk'] else f/(n-1);pose(kind,u)
   path=f'{out}/{kind}-{name}-{f:02}.png'
   if metadata:
    def project(v):
     p=world_to_camera_view(s,c,v);return [round(p.x*128,3),round((1-p.y)*128,3)]
    meta.setdefault(kind,{}).setdefault(name,[]).append({**{n:project(a.matrix_world@a.pose.bones[n].head) for n in ['head','lShldrBend','rShldrBend','hip','lFoot','rFoot','lHand','rHand']},'root':project(Vector((0,0,0))),'ortho':c.data.ortho_scale})
    anchor=project(Vector((0,0,0)))
   elif not os.path.exists(path):s.render.filepath=path;bpy.ops.render.render(write_still=True)
  print('DONE',name,kind,flush=True)
json.dump({'directions':dirs,'counts':counts,'frameSize':128,'anchor':[64,102.925]},open(ROOT+'/work/human-actions/actions.json','w'))

if metadata:json.dump({'anchor':anchor,'clips':meta},open(ROOT+'/work/human-actions/joints.json','w'))
