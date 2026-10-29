# COCKRO VPS remote control

GitHub Actions controls the rented VPS through an outbound self-hosted runner. It does not deploy or synchronize game files. Vercel is not needed for these control operations.

## Use

Open Actions > COCKRO VPS Remote Control > Run workflow. Select branch `main` and an operation. Only dispatches by `sunantongsan` on main execute this workflow.

- `status`: service states, uptime, disk and memory.
- `logs-cockro`, `logs-cockro3d`: last 80 service journal entries.
- `restart-cockro`, `restart-cockro3d`: restart the selected existing service. These interrupt its active sessions.
- `check-https`: checks the fixed public `/health` endpoint. This endpoint is a Caddy response, not proof of multiplayer gameplay health.

## Installed configuration

Runner `cockro-vps-23495491`, label `cockro-vps-control`, directory `/opt/cockro-runner`, systemd `cockro-runner.service` enabled at boot. Runs as the non-login account `cockro-deploy`. Root-owned `/usr/local/sbin/cockro-control` allows only fixed operations via a narrowly scoped sudo rule. The workflow performs no checkout and has no push/PR triggers or repository write token permission.

Treat repository write access as access to the runner account: someone who can alter workflows can execute code as that account. The fixed root helper remains the privilege boundary. Do not add untrusted workflows or broadly grant repository write access.

Initial setup used the provider console. Routine supported operations now use GitHub only. If the VPS/network/runner is down, provider console recovery may still be necessary. No server password is stored in GitHub or Vercel. An unused outbound SSH key from an earlier setup attempt remains in the service account home; no SSH login was enabled for this account.

## Validation 2026-10-29

Run https://github.com/sunantongsan/Xian2/actions/runs/40842334484 executed on the VPS runner and returned all four existing services (cockro, cockro3d, caddy, ssh) active/running. Game services were not restarted during validation. Hosted-runner jobs were blocked by account billing; this self-hosted control run completed successfully.

## Recovery

From an authorized administrator console: `systemctl status cockro-runner --no-pager` and `journalctl -u cockro-runner -n 80 --no-pager`. The official `bin/runsvc.sh` must also be installed as `/opt/cockro-runner/runsvc.sh`; the corrected installer does this. To pause control: `systemctl stop cockro-runner`. Registration credentials are kept on the VPS and must never be printed or committed.
