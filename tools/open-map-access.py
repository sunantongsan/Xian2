#!/usr/bin/env python3
"""Remove only the three map level gates from the installed server, with rollback."""
import pathlib,subprocess,shutil,time
p=pathlib.Path('/opt/cockro-online/online-server.cjs')
s=p.read_text()
changes=[('level >= r.min ? { map: r.id, road: r.id } : null','{ map: r.id, road: r.id }'),('!STAR_ZONES[gate] || p.s.level < STAR_ZONES[gate].min','!STAR_ZONES[gate]'),('!REGIONS[gate] || p.s.level < REGIONS[gate].min','!REGIONS[gate]')]
for old,new in changes:
    if s.count(old)!=1: raise RuntimeError('Live server does not match expected map gate; no changes made')
    s=s.replace(old,new)
candidate=p.with_name('open-map-candidate.cjs');candidate.write_text(s)
subprocess.run(['node','--check',str(candidate)],check=True)
backup=p.with_name('online-server.before-open-maps-'+str(int(time.time()))+'.cjs');shutil.copy2(p,backup)
try:
    shutil.copyfile(candidate,p)
    subprocess.run(['systemctl','restart','cockro-online'],check=True)
    time.sleep(3)
    subprocess.run(['systemctl','is-active','--quiet','cockro-online'],check=True)
    print('OPEN_MAPS_DEPLOYED: all three level gates removed; service active; backup saved')
except:
    shutil.copy2(backup,p)
    subprocess.run(['systemctl','restart','cockro-online'],check=True)
    raise
finally: candidate.unlink(missing_ok=True)
