# COCKRO direct VPS connection — prepared, not activated

Verified on 2026-10-29:
- VPS: 143.14.4.241, Ubuntu 24.04, 2 vCPU / 2 GB.
- Running services: cockro.service, cockro3d.service, caddy.service, ssh.service.
- Public HTTPS health: https://game.guardscan.xyz/health returns "Cockro internal test server".
- Existing Caddy routes: /world -> localhost:8087, /v1/* -> localhost:8088, /pilot/* -> localhost:8090.
- Patch project: cockro-game-updates (Vercel). Game source: Xian2, cockro/automatic-patches.

This branch adds a GitHub-hosted HTTPS connectivity check and a fixed Vercel /api/vps-health probe.
The HTTP endpoint is a Caddy readiness check, not proof of authenticated multiplayer or database health.
The Vercel probe does not execute commands, forward arbitrary URLs, or expose credentials.
No game source, saved data, live service, firewall, or production release was changed.

## Activation pending
1. Confirm a dedicated cockro-deploy account and SSH key for GitHub; do not use root.
2. Configure a root-owned forced-command wrapper accepting only status initially; use restricted authorized_keys (no forwarding, no PTY, no agent/X11).
3. Pin the VPS SSH host key obtained from its trusted console.
4. Store the private key and pinned known-hosts line in GitHub Actions secrets COCKRO_VPS_SSH_KEY and COCKRO_VPS_KNOWN_HOSTS. Never commit or display the private key.
5. Enable repository variable COCKRO_VPS_SSH_ENABLED only after the account and wrapper are installed.
6. Run the workflow, verify HTTPS and SSH jobs; deploy this branch to a Vercel preview and verify /api/vps-health.
7. Before enabling release commands, implement and test a versioned upload directory, archive validation, atomic activation, fixed service restart privileges, health verification and rollback for the chosen backend. No general shell or unrestricted sudo.
8. Restrict release automation to the approved production branch. Never pass deployment secrets to PR code.

GitHub Actions billing/spending errors were reported in earlier release work. Check a fresh run; connectivity preparation does not prove hosted runners can currently start.
VPS deployment automation is NOT active yet. Existing game services are retained. Runtime clients will use the VPS HTTPS/WSS API when the game integration is built.
