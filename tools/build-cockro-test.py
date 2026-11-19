"""Isolated browser test: no real login, network economy, or production saves."""
from pathlib import Path
import sys
r=Path(__file__).resolve().parents[1]
out=Path(sys.argv[1]) if len(sys.argv)>1 else r/'patch-public/play'
out.mkdir(parents=True,exist_ok=True)
source=(r/'web/game.js').read_text()
source=source.replace("const SAVE='road-to-immortality-v1';","const SAVE='cockro-4502-isolated-test';")
source=source.replace('boot();', '''
async function testBoot(){try{
 const has3D=await loadCockroach3D();await document.fonts.load('16px GameThai');
 await Promise.all([loadImage('heroes/cockro-combat-v2.webp'),loadImage('sprites/doctor-einstein-v2.webp'),loadImage('sprites/forge-master-v2.webp'),loadImage('vfx/sword.webp'),loadImage('vfx/demon.webp'),loadLayeredHero('sword-cockro'),loadZone()]);
 s=fresh('sword-cockro');Object.assign(s,{name:'COCKRO TEST',level:61,mutationStage:2,stones:100000,protectionTickets:5,statPoints:600,skillPoints:600,sound:false});
 s.equip.weapon.plus=0;onlineMode=false;
 p={x:0,y:0,hp:maxHP(s),mp:combatStats(s).mp,face:1,anim:'idle',animTime:0,walkDistance:0,walkDX:.707,walkDY:.707,back:false,inv:0,dead:false};
 cooldown={attack:0,skill:0,dash:0,potion:0};skillTimers={};
 $('loading').hidden=true;document.body.classList.remove('welcome-screen');$('hud').hidden=false;$('controls').hidden=false;$('hint').hidden=true;
 await travel(0,true);window.cockroBootReady=true;gameFrames.start();
 const note=document.createElement('small');note.style='position:fixed;bottom:0;left:35%;z-index:20;background:#edf9ff;color:#123;padding:4px;border-radius:6px';note.textContent=has3D?'TEST • 4.50.2 • 3D':'TEST • 4.50.2 • 2D fallback (WebGL unavailable)';document.body.append(note);
 show(`<h2>COCKRO 4.50.2 · TEST</h2><p>ทดสอบเดิน ต่อสู้ และตีบวก • เหรียญจำลอง 100,000 • ตั๋ว 5 ใบ</p><p>แยกจากบัญชีจริง ไม่มีการจ่ายชดเชยหรือธุรกรรมจริงในหน้านี้</p><button id="testPlay">เริ่มทดสอบ</button>`);$('testPlay').onclick=close;
}catch(e){$('loadText').textContent='Test startup failed: '+e.message;console.error(e);}}
testBoot();
''')
# These controls cannot accidentally authenticate or attach to the production world.
source=source.replace("new OnlineClient(","new OnlineClient(")
source=source.replace("async function title(){", "async function title(){location.reload();return;")
source=source.replace("async function googleLogin(","async function disabledGoogleLogin(")
(out/'test-game.js').write_text(source)
html=(r/'web/index.html').read_text().replace('src="game.js"','src="test-game.js"')
(out/'test.html').write_text(html)
# Test page blocks every WebSocket and external connection, including account APIs.
html=html.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="connect-src \'self\' blob: data:;">')
(out/'test.html').write_text(html)
