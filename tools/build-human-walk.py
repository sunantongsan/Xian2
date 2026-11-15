import bpy,math,json,os,sys
from mathutils import Vector,Quaternion
args=sys.argv[sys.argv.index('--')+1:]
if len(args)!=2:raise SystemExit('Usage: blender -b --python build_walk.py -- ORIGINAL.glb OUTPUT_FOLDER')
ROOT=os.path.abspath(args[1])
os.makedirs(ROOT+'/work',exist_ok=True);os.makedirs(ROOT+'/output',exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(args[0]))
center=Vector((0,0,.95))
bpy.ops.object.camera_add(location=center+Vector((3,-5,1)))
c=bpy.context.object;c.rotation_euler=(center-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=2.5
scene=bpy.context.scene;scene.camera=c
for loc,power,size in [((3,-4,5),700,5),((-3,-1,3),400,4)]:
 bpy.ops.object.light_add(type='AREA',location=loc);bpy.context.object.data.energy=power;bpy.context.object.data.size=size
scene.render.engine='CYCLES';scene.world=bpy.data.worlds.new('World');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
scene.render.resolution_percentage=100
a=next(o for o in bpy.data.objects if o.type=='ARMATURE');s=bpy.context.scene
rest={b.name:b.head.copy() for b in a.pose.bones}
for b in a.pose.bones:b.rotation_mode='QUATERNION'
hip=a.pose.bones['hip'];identity=Quaternion()
positions=[]
for frame in range(33):
 t=frame/32;theta=2*math.pi*t
 for b in a.pose.bones:b.rotation_quaternion=identity;b.location=(0,0,0)
 hip.location.y=-2.3+.35*math.cos(2*theta)
 bpy.context.view_layer.update()
 for side,offset,sign in [('l',0,1),('r',.5,-1)]:
  p=(t+offset)%1
  if p<.6: z=18-36*p/.6;lift=0
  else:
   u=(p-.6)/.4;z=-18+36*(u*u*(3-2*u));lift=9*math.sin(math.pi*u)**1.3
  names=[side+'ThighBend',side+'Shin',side+'Foot']
  upper,knee,foot=[a.pose.bones[n] for n in names]
  h=upper.head.copy();goal=Vector((sign*14,rest[names[2]].y+lift,rest[names[2]].z+z))
  v1=rest[names[1]]-rest[names[0]];v2=rest[names[2]]-rest[names[1]]
  L1,L2=v1.length,v2.length;dv=goal-h;dist=dv.length;d=dv.normalized()
  front=Vector((0,0,1));bend=(front-d*front.dot(d)).normalized()
  along=(L1*L1-L2*L2+dist*dist)/(2*dist);height=math.sqrt(max(0,L1*L1-along*along))
  k=h+d*along+bend*height
  q1=v1.rotation_difference(k-h);q2=v2.rotation_difference(goal-k)
  upper.rotation_quaternion=q1;knee.rotation_quaternion=q1.inverted()@q2
  foot.rotation_quaternion=q2.inverted()
  # Opposite arm to leading leg; slight elbow flexion, relaxed wrist.
  a.pose.bones[side+'ShldrBend'].rotation_quaternion=Quaternion((1,0,0),.34*math.cos(2*math.pi*p))
  a.pose.bones[side+'ForearmBend'].rotation_quaternion=Quaternion((1,0,0),-.13-.10*max(0,-math.cos(2*math.pi*p)))
 for name in ['hip','lThighBend','lShin','lFoot','rThighBend','rShin','rFoot','lShldrBend','rShldrBend','lForearmBend','rForearmBend']:
  b=a.pose.bones[name];b.keyframe_insert(data_path='rotation_quaternion',frame=frame+1,group=name)
 hip.keyframe_insert(data_path='location',frame=frame+1,group='hip')
 bpy.context.view_layer.update()
 positions.append({'frame':frame,'left_foot':list(a.matrix_world@a.pose.bones['lFoot'].head),'right_foot':list(a.matrix_world@a.pose.bones['rFoot'].head),'left_hand':list(a.matrix_world@a.pose.bones['lHand'].head),'right_hand':list(a.matrix_world@a.pose.bones['rHand'].head)})
a.animation_data.action.name='Walk_InPlace_8Directions'
for fc in a.animation_data.action.fcurves:
 for key in fc.keyframe_points:key.interpolation='LINEAR'
s.frame_start=1;s.frame_end=32;s.render.fps=32
s.cycles.samples=8;s.cycles.use_denoising=False;s.render.resolution_x=384;s.render.resolution_y=384
s.world.node_tree.nodes['Background'].inputs[0].default_value=(.82,.87,.92,1)
s.render.film_transparent=True
s.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/output/COCKRO-Human-Walk.blend')
bpy.ops.object.select_all(action='DESELECT');a.select_set(True)
for o in bpy.data.objects:
 if o.type=='MESH':o.select_set(True)
bpy.context.view_layer.objects.active=a
bpy.ops.export_scene.gltf(filepath=ROOT+'/output/COCKRO-Human-Walk.glb',use_selection=True,export_animations=True,export_frame_range=True,export_force_sampling=True)
json.dump(positions,open(ROOT+'/work/joints.json','w'),indent=2)
center=Vector((0,0,.94));c=s.camera;c.location=center+Vector((5,0,.6));c.rotation_euler=(center-c.location).to_track_quat('-Z','Y').to_euler();c.data.ortho_scale=2.15
for frame in [1,9,17,25]:
 s.frame_set(frame);s.render.filepath=ROOT+f'/work/check-{frame}.png';bpy.ops.render.render(write_still=True)
