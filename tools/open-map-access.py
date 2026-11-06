#!/usr/bin/env python3
"""Remove only the three map level gates from the installed server, with rollback."""
import hashlib,pathlib,subprocess,shutil,time
p=pathlib.Path('/opt/cockro-online/online-server.cjs')
s=p.read_text()
changes=[('level >= r.min ? { map: r.id, road: r.id } : null','{ map: r.id, road: r.id }'),('!STAR_ZONES[gate] || p.s.level < STAR_ZONES[gate].min','!STAR_ZONES[gate]'),('!REGIONS[gate] || p.s.level < REGIONS[gate].min','!REGIONS[gate]')]
for old,new in changes:
    if s.count(old)!=1: raise RuntimeError('Live server does not match expected map gate; no changes made')
    s=s.replace(old,new)
stage=pathlib.Path('/srv/cockro-deploy/online-stage');stage.mkdir(parents=True,exist_ok=True)
candidate=stage/'online-server.cjs';candidate.write_text(s)
subprocess.run(['node','--check',str(candidate)],check=True)
backup=stage/('before-open-maps-'+str(int(time.time()))+'.cjs');shutil.copy2(p,backup)
def deploy():
    digest=hashlib.sha256(candidate.read_bytes()).hexdigest()
    subprocess.run(['sudo','-n','/usr/local/sbin/cockro-deploy-online',digest],check=True)
try:
    deploy()
    time.sleep(3)
    subprocess.run(['systemctl','is-active','--quiet','cockro-online'],check=True)
    assert p.read_text()==s
    print('OPEN_MAPS_DEPLOYED: all three level gates removed; service active; backup saved')
except:
    shutil.copyfile(backup,candidate)
    deploy()
    raise
