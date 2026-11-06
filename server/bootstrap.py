#!/usr/bin/env python3
"""One-time bounded service setup; subsequent releases run through GitHub."""
import os, pathlib, pwd, shutil, subprocess
ROOT=pathlib.Path('/opt/cockro-online')
DATA=pathlib.Path('/var/lib/cockro-online')
HELPER='''#!/usr/bin/python3
import hashlib, os, pathlib, re, subprocess, sys
if len(sys.argv)!=2 or not re.fullmatch(r'[0-9a-f]{64}',sys.argv[1]):
    raise SystemExit('Expected release SHA256')
source='/srv/cockro-deploy/online-stage/online-server.cjs'
fd=os.open(source,os.O_RDONLY|os.O_NOFOLLOW)
with os.fdopen(fd,'rb') as f: data=f.read(2000001)
if len(data)>2000000 or hashlib.sha256(data).hexdigest()!=sys.argv[1]:
    raise SystemExit('Release checksum mismatch')
root=pathlib.Path('/opt/cockro-online')
current=root/'online-server.cjs'
if current.exists(): (root/'previous.cjs').write_bytes(current.read_bytes())
nextfile=root/'next.cjs'
nextfile.write_bytes(data)
nextfile.chmod(0o644)
os.replace(nextfile,current)
subprocess.run(['systemctl','restart','cockro-online.service'],check=True)
'''
UNIT='''[Unit]
Description=COCKRO 2.5D online world
After=network-online.target
Wants=network-online.target
[Service]
User=cockro-online
Group=cockro-online
WorkingDirectory=/opt/cockro-online
ExecStart=/opt/cockro-online/node /opt/cockro-online/online-server.cjs
Environment=COCKRO_ONLINE_DATA=/var/lib/cockro-online
Restart=always
RestartSec=3
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/var/lib/cockro-online
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
MemoryMax=384M
CPUQuota=80%
[Install]
WantedBy=multi-user.target
'''
if os.geteuid()!=0: raise SystemExit('Administrator required for initial service setup')
try: account=pwd.getpwnam('cockro-online')
except KeyError:
    subprocess.run(['useradd','--system','--home-dir',str(DATA),'--shell','/usr/sbin/nologin','cockro-online'],check=True)
    account=pwd.getpwnam('cockro-online')
ROOT.mkdir(mode=0o755,exist_ok=True);DATA.mkdir(mode=0o700,exist_ok=True)
os.chown(DATA,account.pw_uid,account.pw_gid)
node=next((pathlib.Path('/opt/cockro-runner/externals')/v/'bin/node' for v in ('node24','node20') if (pathlib.Path('/opt/cockro-runner/externals')/v/'bin/node').is_file()),None)
if not node:raise SystemExit('Runner Node runtime missing')
shutil.copyfile(node,ROOT/'node');(ROOT/'node').chmod(0o755)
helper=pathlib.Path('/usr/local/sbin/cockro-deploy-online')
if helper.exists() and helper.read_text()!=HELPER:raise SystemExit('Inspect existing deployment helper before replacing')
helper.write_text(HELPER);helper.chmod(0o755)
rule=pathlib.Path('/etc/sudoers.d/cockro-online')
text='cockro-deploy ALL=(root) NOPASSWD: /usr/local/sbin/cockro-deploy-online\n'
if rule.exists() and rule.read_text()!=text:raise SystemExit('Inspect existing sudo rule')
candidate=pathlib.Path('/tmp/cockro-online.sudoers');candidate.write_text(text);candidate.chmod(0o440)
subprocess.run(['visudo','-cf',str(candidate)],check=True);shutil.copyfile(candidate,rule);rule.chmod(0o440)
pathlib.Path('/etc/systemd/system/cockro-online.service').write_text(UNIT)
subprocess.run(['systemctl','daemon-reload'],check=True)
subprocess.run(['systemctl','enable','cockro-online.service'],check=True)
caddy=pathlib.Path('/etc/caddy/Caddyfile');original=caddy.read_text()
if 'handle /online/*' not in original:
    marker='game.guardscan.xyz {'
    if original.count(marker)!=1:raise SystemExit('Unexpected Caddy site layout')
    updated=original.replace(marker,marker+'\n    handle /online/* {\n        reverse_proxy 127.0.0.1:8091 {\n            header_up X-Real-IP {remote_host}\n        }\n    }',1)
    check=pathlib.Path('/etc/caddy/Caddyfile.online-check');check.write_text(updated)
    subprocess.run(['caddy','validate','--config',str(check),'--adapter','caddyfile'],check=True)
    backup=pathlib.Path('/etc/caddy/Caddyfile.before-online')
    if not backup.exists():backup.write_text(original)
    caddy.write_text(updated)
    try:subprocess.run(['systemctl','reload','caddy'],check=True)
    except Exception:
        caddy.write_text(original);subprocess.run(['systemctl','reload','caddy']);raise
print('Online service and fixed deploy command ready. Deploy the reviewed release through GitHub.')
