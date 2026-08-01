# Lex Looter Stake Engine Readiness

Last local verification: 2026-08-01

## Local Evidence

- Frontend build and lint are expected to run from `web-sdk` with `pnpm --filter lex-looter build` and `pnpm --filter lex-looter lint`.
- Math checks are expected to run from `math-sdk` with `env/bin/python -m pytest tests`.
- Mock RGS checks are expected to run from `mock-rgs` with `../math-sdk/env/bin/python -m pytest test_server.py`.
- Game thumbnail: use the existing approved Lex Looter thumbnail supplied for the game; no generated thumbnail is included by this readiness pass.

## Automated Coverage Added

- Authenticate returns dynamic bet levels/modes and can return Social Mode jurisdiction for `XSC`, `XGC`, or `social: true`.
- Active rounds are returned by authenticate with the original amount and mode.
- Play succeeds for configured modes through the mock RGS path.
- Replay URL support returns stored rounds by round id, including amount, mode, cost multiplier, display multiplier, and event state.
- Insufficient balance returns `ERR_IPB` without creating an active round.

## Manual / External Evidence Still Required

- Stake artwork guideline review for the thumbnail.
- Offensive/inappropriate content review for final uploaded assets.
- Title uniqueness and distinctness review against existing Stake Engine titles.
- Provably Fair and Replay enabled in Stake Engine.
- Frontend and Math approval requests accepted in Stake Engine.
- `stake-engine-game-approved` channel post completed.
- Older Android and iOS device smoke test completed.
- Approval request closed after live release, with Slack notification reactions added.
