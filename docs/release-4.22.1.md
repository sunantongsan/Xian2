# COCKRO 4.22.1 — enter-game hotfix

4.22.0 updated the backend release label to 4.22.0, while the shipped OnlineClient still allowed only backend release labels 4.19.0 and 4.20.0. The client rejected a successful welcome handshake, disconnected, and returned to the welcome screen after Play. Patch download itself was successful.

Removed the obsolete content-release whitelist. Wire compatibility remains enforced by the server against cockro-online-2 before a welcome is sent. State messages are ignored before welcome acceptance. No server, account, character or gameplay content migration is needed.

Regression: the actual web/online.js client failed against the current server before the fix with the same obsolete release error. After the fix it enters town, receives authoritative state, stores its token and reconnects to its saved character. A second socket test confirms incompatible protocols are still rejected. The previous raw-socket smoke test did not exercise the client release whitelist, which is why it missed this failure.

Client patch 4.22.1; backend remains 4.22.0. Keep app data; close and reopen to receive the hotfix.
