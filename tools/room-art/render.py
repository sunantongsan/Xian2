import bpy,math,json,os,sys
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
source=sys.argv[sys.argv.index('--')+1]
bpy.ops.wm.open_mainfile(filepath=source)
s=bpy.context.scene;a=next(o for o in s.objects if o.type=='ARMATURE')
for t in list(a.animation_data.nla_tracks):a.animation_data.nla_tracks.remove(t)
for n in ['Studio_Floor','Icosphere']:
 if n in bpy.data.objects:bpy.data.objects[n].hide_render=True
s.render.engine='CYCLES';s.cycles.samples=8;s.cycles.use_denoising=False;s.render.film_transparent=True
s.render.resolution_x=160;s.render.resolution_y=160;s.render.resolution_percentage=100
s.view_settings.view_transform='Standard';s.view_settings.look='Medium High Contrast' if False else 'None';s.view_settings.exposure=.3
cam=s.camera;cam.data.type='ORTHO';cam.data.ortho_scale=2.65
out='/tmp/cockro-room-frames';meta={'size':160,'directions':8,'clips':{}}
clips=[('idle','Hold',1),('walk','ArmedWalk',12),('attack','Shoot',8),('dead','Death',8)]
for key,action,count in clips:
 meta['clips'][key]={'frames':count,'roots':[]}
 for d in range(8):
  yaw=-d*math.pi/4;cam.location=Vector((math.sin(yaw)*4,-math.cos(yaw)*4,3));cam.rotation_euler=(Vector((0,0,.9))-cam.location).to_track_quat('-Z','Y').to_euler()
  a.animation_data.action=bpy.data.actions[action]
  for f in range(count):
   start,end=a.animation_data.action.frame_range;frame=start+(end-start)*f/(count if key=='walk' else max(1,count-1));s.frame_set(int(frame),subframe=frame-int(frame));bpy.context.view_layer.update()
   root=world_to_camera_view(s,cam,Vector((0,0,0)))
   if f==0:meta['clips'][key]['roots'].append([round(root.x*160,2),round((1-root.y)*160,2)])
   s.render.filepath=f'{out}/{key}-{d}-{f}.png';bpy.ops.render.render(write_still=True)
   if os.environ.get('PREVIEW_ONLY'):break
  if os.environ.get('PREVIEW_ONLY'):break
 if os.environ.get('PREVIEW_ONLY'):break
open(out+'/manifest.json','w').write(json.dumps(meta))
