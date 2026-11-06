#!/usr/bin/env python3
"""Root-only, narrowly scoped purchase verification setup. Never prints secrets."""
import hashlib,json,os,pathlib,pwd,secrets,shutil,subprocess,sys,time,urllib.request
CONFIG=pathlib.Path('/etc/cockro-play-relay.json')
STAGE=pathlib.Path('/srv/cockro-deploy/billing-stage')
SERVER=pathlib.Path('/opt/cockro-online/online-server.cjs')
OVERRIDE=pathlib.Path('/etc/systemd/system/cockro-online.service.d/billing.conf')
URL='https://uzinxxeadejmzxqmqqtx.supabase.co/functions/v1/cockro-play-relay'
PRODUCTS=['cockro_gold_5000','cockro_gold_20000','cockro_gold_150000','cockro_gold_500000']
def probe():
    c=json.loads(CONFIG.read_text())
    for product in PRODUCTS:
        req=urllib.request.Request(URL,data=json.dumps({'action':'probe','product':product}).encode(),headers={'Authorization':'Bearer '+c['token'],'Content-Type':'application/json'})
        with urllib.request.urlopen(req,timeout=35) as r: result=json.load(r)
        if result.get('ready') is not True: raise RuntimeError('Product is not ready: '+product)
        print('Ready:',product)
if os.geteuid()!=0: raise SystemExit('Root required')
mode=sys.argv[1] if len(sys.argv)==2 else ''
if mode=='prepare':
    if not CONFIG.exists():
        fd=os.open(CONFIG,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,'w') as f: json.dump({'url':URL,'token':secrets.token_hex(32)},f)
        account=pwd.getpwnam('cockro-online');os.chown(CONFIG,account.pw_uid,account.pw_gid)
    c=json.loads(CONFIG.read_text())
    if c.get('url')!=URL or len(c.get('token',''))!=64: raise SystemExit('Unexpected existing configuration')
    print('RELAY_TOKEN_SHA256='+hashlib.sha256(c['token'].encode()).hexdigest())
elif mode=='probe': probe()
elif mode=='deploy':
    probe()
    bundle=STAGE/'online-server.cjs';digest=hashlib.sha256(bundle.read_bytes()).hexdigest()
    expected=(STAGE/'bundle.sha256').read_text().split()[0]
    if digest!=expected:raise SystemExit('Staged bundle checksum mismatch')
    current=hashlib.sha256(SERVER.read_bytes()).hexdigest()
    if current!='c87e67e009e0e6f94ed5771b236dccc99e9d03c662f1e0e275408bee69e0dcb1':raise SystemExit('Production changed; inspect before deploying: '+current)
    subprocess.run(['/opt/cockro-online/node','--check',str(bundle)],check=True)
    backup=pathlib.Path('/opt/cockro-online/before-billing-'+str(int(time.time())));backup.mkdir(mode=0o700)
    shutil.copy2(SERVER,backup/'online-server.cjs')
    old_override=OVERRIDE.read_bytes() if OVERRIDE.exists() else None
    if old_override is not None:(backup/'billing.conf').write_bytes(old_override)
    OVERRIDE.parent.mkdir(exist_ok=True)
    try:
        OVERRIDE.write_text('[Service]\nEnvironment=COCKRO_PLAY_RELAY_CONFIG=/etc/cockro-play-relay.json\n');OVERRIDE.chmod(0o644)
        candidate=SERVER.with_name('billing-next.cjs');shutil.copyfile(bundle,candidate);candidate.chmod(0o644);os.replace(candidate,SERVER)
        subprocess.run(['systemctl','daemon-reload'],check=True);subprocess.run(['systemctl','restart','cockro-online'],check=True)
        for attempt in range(10):
            try:
                with urllib.request.urlopen('http://127.0.0.1:8091/online/health',timeout=4) as r: health=json.load(r)
                if health.get('ok') and health.get('release')=='4.45.0':break
            except Exception:pass
            time.sleep(1)
        else:raise RuntimeError('Health check failed')
        print('DEPLOYED_BILLING_BUNDLE='+digest)
        print('BACKUP='+str(backup))
    except Exception:
        shutil.copy2(backup/'online-server.cjs',SERVER)
        if old_override is None:OVERRIDE.unlink(missing_ok=True)
        else:OVERRIDE.write_bytes(old_override)
        subprocess.run(['systemctl','daemon-reload']);subprocess.run(['systemctl','restart','cockro-online']);raise
else:raise SystemExit('Expected prepare, probe or deploy')
