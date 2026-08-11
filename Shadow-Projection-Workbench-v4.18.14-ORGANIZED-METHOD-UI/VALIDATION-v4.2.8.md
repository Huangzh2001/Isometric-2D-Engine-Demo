# v4.2.8 Direction Classification

## Direction models
- `player-local-cardinal4`: N/E/S/W semantic slots (player front/right/back/left UI arrangement)
- `diagonal4`: NE/SE/SW/NW
- `oct8`: N/NE/E/SE/S/SW/W/NW, distinct assets
- `single8`: one image reused explicitly across all 8 direction slots

## Fixed diagonal parity rule preserved
- NE: flip
- SE: no flip
- SW: flip
- NW: no flip

## Checks
- `node --check app.js`: PASS
- `node test_math.js`: 6/6 PASS
