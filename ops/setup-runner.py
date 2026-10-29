#!/usr/bin/env python3
"""One-time install of official GitHub runner and bounded VPS operations."""
import hashlib, os, pathlib, pwd, shutil, subprocess, tarfile, urllib.request

URL = 'https://github.com/actions/runner/releases/download/v2.338.2/actions-runner-linux-x64-2.338.2.tar.gz'
SHA256 = 'baebf204307bac6193480852732f0aba2ae97b6c5597c244f4d5558390147c40'
USER = 'cockro-deploy'
ROOT = pathlib.Path('/opt/cockro-runner')
HELPER = '''#!/bin/sh
set -eu
PATH=/usr/sbin:/usr/bin:/sbin:/bin
export PATH
test "$#" -eq 1 || exit 2
case "$1" in
  status)
    systemctl show cockro.service cockro3d.service caddy.service ssh.service --property=Id,ActiveState,SubState
    uptime
    df -h / /opt
    free -m
    ;;
  logs-cockro) journalctl -u cockro.service -n 80 --no-pager -o short-iso ;;
  logs-cockro3d) journalctl -u cockro3d.service -n 80 --no-pager -o short-iso ;;
  restart-cockro) systemctl restart cockro.service; systemctl is-active cockro.service ;;
  restart-cockro3d) systemctl restart cockro3d.service; systemctl is-active cockro3d.service ;;
  check-https) curl --proto '=https' --tlsv1.2 --fail --silent --show-error --max-time 15 https://game.guardscan.xyz/health ;;
  *) echo 'Unsupported operation' >&2; exit 2 ;;
esac
'''
UNIT = '''[Unit]
Description=COCKRO GitHub remote control runner
After=network-online.target
Wants=network-online.target

[Service]
User=cockro-deploy
Group=cockro-deploy
WorkingDirectory=/opt/cockro-runner
ExecStart=/opt/cockro-runner/runsvc.sh
Restart=always
RestartSec=10
TimeoutStopSec=60
KillMode=mixed
UMask=0077
PrivateTmp=true
ProtectHome=true
ProtectSystem=full
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
MemoryMax=512M
CPUQuota=50%

[Install]
WantedBy=multi-user.target
'''

def main():
    if os.geteuid() != 0:
        raise SystemExit('Run installer as root')
    account = pwd.getpwnam(USER)
    if account.pw_shell != '/usr/sbin/nologin':
        raise SystemExit('Expected non-login service account')
    ROOT.mkdir(mode=0o700, exist_ok=True)
    if (ROOT/'.runner').exists():
        raise SystemExit('Runner already registered; leave configuration intact')
    archive = pathlib.Path('/tmp/cockro-actions-runner.tar.gz')
    urllib.request.urlretrieve(URL, archive)
    with archive.open('rb') as f:
        digest = hashlib.file_digest(f, 'sha256').hexdigest()
    if digest != SHA256:
        raise SystemExit('Runner checksum mismatch')
    with tarfile.open(archive) as bundle:
        bundle.extractall(ROOT, filter='data')
    shutil.copy2(ROOT/'bin/runsvc.sh', ROOT/'runsvc.sh')
    shutil.chown(ROOT, user=USER, group=USER)
    for folder, dirs, files in os.walk(ROOT):
        for name in dirs + files:
            os.chown(pathlib.Path(folder)/name, account.pw_uid, account.pw_gid, follow_symlinks=False)
    helper = pathlib.Path('/usr/local/sbin/cockro-control')
    if helper.exists() and helper.read_text() != HELPER:
        raise SystemExit('Existing control helper differs; inspect before replacing')
    helper.write_text(HELPER)
    helper.chmod(0o755)
    os.chown(helper, 0, 0)
    sudoers = pathlib.Path('/etc/sudoers.d/cockro-control')
    rule = 'cockro-deploy ALL=(root) NOPASSWD: /usr/local/sbin/cockro-control\n'
    if sudoers.exists() and sudoers.read_text() != rule:
        raise SystemExit('Existing sudo rule differs')
    candidate = pathlib.Path('/tmp/cockro-control.sudoers')
    candidate.write_text(rule)
    candidate.chmod(0o440)
    subprocess.run(['visudo', '-cf', str(candidate)], check=True)
    shutil.copyfile(candidate, sudoers)
    sudoers.chmod(0o440)
    pathlib.Path('/etc/systemd/system/cockro-runner.service').write_text(UNIT)
    subprocess.run(['systemctl', 'daemon-reload'], check=True)
    subprocess.run(['runuser', '-u', USER, '--', 'sudo', '-n', str(helper), 'status'], check=True)
    print('Runner software installed. Registration and service activation are pending.')

if __name__ == '__main__':
    main()
