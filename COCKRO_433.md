# COCKRO 4.33.0 / Android 110 candidate

Preserves all existing accounts and four character slots. Adds an account warehouse for G, COCKRO coin, bag equipment, potions, upgrade materials and unused EXP tickets. Equipped gear must first be removed; temporary fashion is excluded. Warehouse capacity is 120 entries. Character wallet and stack limits are enforced before every transfer.

Player stalls persist in town while the owner is offline or on another character. One stall per account, up to 12 escrowed listings, with G or Coin prices per entire bundle. Buyers must be within 350 world units of the stall; the seller need not remain present. Payment goes to the character currently owning the stall. Opening from another character explicitly moves the stall and assigns that character as owner. Closing keeps listed items recoverable. Last 50 sales are shown. Character deletion is blocked while that character owns listed items.

All mutations require the latest ledger revision. A synchronous fsynced write-ahead journal commits the ledger and involved character saves together, replays interrupted commits before actor restore and fences gameplay after storage failure. This design assumes the existing single server process owns the save directory; multiple processes must not share it. Rejects self-purchases, stale requests, spoofed prices, equipped/non-transferable items, overflow and purchases racing billing operations. Account deletion removes the warehouse and store; existing accounts have not been deleted.

Validation: 214 Node tests (including real sockets, offline sale across restart, simultaneous buyers, WAL interruption, balance conservation, stale replay and access isolation), JavaScript syntax, server bundling and asset checks. Headless Chromium exercises warehouse/shop/market at 360x640, 390x844 and 844x390; numeric deposits and horizontal overflow checked. Existing stats and EXP-ticket browser checks retained.

Not yet deployed or submitted to Play. Native CI/build/signing and full live authentication/recovery/deletion verification remain release gates. Tess now exposes the correct Supabase project, but connecting it alone does not configure server-side Auth deletion credentials. Do not claim a live release until these gates pass.

## Play version 108 rejection investigation

Play Console on 2 November reports Broken Functionality / unresponsive UI for code 108. Its IN_APP_EXPERIENCE-3002.png attachment shows the native startup screen after selecting the installed-version button. Found two concrete defects: native boot validation only accepted #choose (absent on fresh Google-login screens), and Skip waited for network disconnect/update worker completion. The candidate now recognizes the Google sign-in screen and an explicit web-ready flag; Skip opens bundled assets immediately, cancels network teardown off the UI thread, and a 15-second startup watchdog provides the same fallback. Forced bundle boot does not mark an untested installed patch healthy.

A browser test boots actual assets with empty storage, checks the native readiness expression on the Google login screen, clicks Google, and verifies a real local server's PKCE URL reaches the native bridge. A new JVM test blocks HTTP disconnect and proves cancellation returns without waiting. Native CI must rerun for these changes; the first 110 artifact predates this startup fix and must not be submitted.

## Server-side identity cleanup bridge

The game server now persists a private Ed25519 signing key under its protected data directory and exposes only the public key in health. A Supabase Edge handler verifies that key, exact request bytes and a two-minute timestamp before invoking Auth admin deletion. The service-role key remains inside Supabase. Pending jobs retry idempotently; no existing account is deleted by deployment. This bridge still needs its public-key binding deployed and live invalid-signature verification before release. 216 Node tests cover signed calls, tampering, expired requests, key persistence and protected key permissions.
