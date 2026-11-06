from pathlib import Path
import subprocess,json,hashlib
import argparse
parser=argparse.ArgumentParser(description='Adapt licensed Pixabay sources for integrated game playback')
parser.add_argument('source_dir',type=Path,help='Directory containing laser.mp3, magic.mp3 and menu.mp3 downloaded from sources in web/audio/credits.json')
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]; src=args.source_dir; out=root/'web/audio'
laser=src/'laser.mp3'; magic=src/'magic.mp3'; music=src/'menu.mp3'
def render(name,file,start,duration,filters):
 subprocess.run(['ffmpeg','-v','error','-y','-ss',str(start),'-i',str(file),'-t',str(duration),'-af',filters+',alimiter=limit=0.7:level=false','-ar','44100','-ac','2','-b:a','96k',str(out/(name+'.mp3'))],check=True)
render('skill-wave',laser,0,1.1,'highpass=f=160,lowpass=f=6500,afade=t=out:st=0.8:d=0.3')
render('skill-dash',laser,0,0.65,'atempo=1.6,highpass=f=500,afade=t=out:st=0.4:d=0.25')
render('skill-bolt',laser,0,0.45,'atempo=2,highpass=f=900,afade=t=out:st=0.2:d=0.25')
render('skill-circle',magic,0,1.15,'asetrate=33075,aresample=44100,lowpass=f=4500,afade=t=out:st=0.8:d=0.35')
render('skill-field',magic,0,2.2,'aecho=0.7:0.5:180:0.3,lowpass=f=6000,afade=t=out:st=1.6:d=0.6')
render('ui-confirm',magic,0.1,.65,'highpass=f=1000,afade=t=out:st=0.25:d=0.4')
render('ui-tap',magic,0.1,.12,'lowpass=f=1800,afade=t=out:st=0.03:d=0.09')
render('hit-soft',laser,0,.22,'asetrate=30000,aresample=44100,lowpass=f=1200,afade=t=out:st=0.04:d=0.18')
render('welcome-loop',music,0,64,'loudnorm=I=-23:TP=-3:LRA=7,afade=t=in:st=0:d=2,afade=t=out:st=61:d=3')
render('create-loop',music,64,64,'loudnorm=I=-23:TP=-3:LRA=7,afade=t=in:st=0:d=2,afade=t=out:st=61:d=3')
render('world-loop',music,128,60,'loudnorm=I=-24:TP=-3:LRA=7,afade=t=in:st=0:d=2,afade=t=out:st=57:d=3')
credits={'license':'Pixabay Content License','licenseUrl':'https://pixabay.com/service/license-summary/','downloaded':'2026-11-01','sources':[{'title':'Whoosh Laser Beam','author':'SoundReality','url':'https://pixabay.com/sound-effects/film-special-effects-whoosh-laser-beam-247160/','sha256':hashlib.sha256(laser.read_bytes()).hexdigest(),'derivatives':['skill-wave','skill-dash','skill-bolt','hit-soft']},{'title':'Magical Spell Cast','author':'DavidDumaisAudio','url':'https://pixabay.com/sound-effects/film-special-effects-magical-spell-cast-190272/','sha256':hashlib.sha256(magic.read_bytes()).hexdigest(),'derivatives':['skill-circle','skill-field','ui-confirm','ui-tap']},{'title':'deep ambient electronic theme music loading screen menu | dejco.art','author':'dejcomin','aiGenerated':True,'url':'https://pixabay.com/music/beats-deep-ambient-electronic-theme-music-loading-screen-menu-dejcoart-429846/','sha256':hashlib.sha256(music.read_bytes()).hexdigest(),'derivatives':['welcome-loop','create-loop','world-loop']}],'adaptations':'Trimmed, filtered, faded and level-limited for integrated game playback. Not a standalone audio pack.'}
(out/'credits.json').write_text(json.dumps(credits,ensure_ascii=False,indent=2)+'\n')
