# COCKRO Play purchase verification

The production game disables purchases because its verifier has no credentials. Products are active in Play Console, but that alone does not enable the game server.

This change adds a narrowly scoped server-to-server verifier at the existing Supabase project. It reuses the existing Google service account inside Supabase; the Google private key never moves to the game server or client. The new endpoint accepts a separate 256-bit secret and only the four COCKRO products. Existing NOVA functions and wallet tables are not changed.

## Activation steps

1. Grant `nova-play-billing@nova-login-512211.iam.gserviceaccount.com` app access to **COCKRO MAN** only, with view financial data and manage orders/subscriptions permissions required by the Play Billing API. Do not grant account administrator or release permissions.
2. Generate a random 32-byte hex secret through a secure server channel. Store it as `COCKRO_PLAY_RELAY_TOKEN` in Supabase and as the `token` in a service-readable, mode-0600 JSON file on the VPS. Never commit the secret, print it in logs, or put it in the Android app.
3. The JSON `url` must be `https://uzinxxeadejmzxqmqqtx.supabase.co/functions/v1/cockro-play-relay`. Configure `COCKRO_PLAY_RELAY_CONFIG` with the file path in the systemd service.
4. Deploy `supabase/functions/cockro-play-relay/index.ts` and `handler.mjs` as a new `cockro-play-relay` function. Disable the platform JWT check only for this function: the handler authenticates its own server secret and fails closed when absent. Preserve all existing functions.
5. Probe each product through the authenticated endpoint, using `{action:"probe",product:"cockro_gold_5000"}` and the other three IDs. Require readiness for all four. Confirm unauthenticated requests fail. A successful product probe is not proof of a completed purchase.
6. Build from the exact production server release plus this verifier change, run purchase/relay tests, back up the current bundle/config, deploy and restart only `cockro-online`. Confirm the game welcome enables billing and the client fetches live prices.
7. Have the configured license tester use **Test card, always approves**. Verify a single durable 5,000-coin grant, purchase history, and no duplicate grant on restore. Do not claim end-to-end success until this test is observed.

## Rollback

Remove the relay environment setting and restore the previous bundle to disable purchasing safely. Preserve saves and receipt journals. Do not roll back player balances or erase purchase receipts.

## Validation

`node --test tests/play-relay.test.js tests/shop-billing.test.js`

The tests cover authentication failure, product/package restriction, filtered responses, upstream failures, missing configuration, persisted credit before consumption, duplicate receipts and wrong owners. No real purchase has been made by these tests.
