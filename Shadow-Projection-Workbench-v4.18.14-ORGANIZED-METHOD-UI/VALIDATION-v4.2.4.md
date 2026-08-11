# Validation v4.2.4 — direction models

This build changes the direction semantics in the small demo only.

## Main changes

- Added explicit direction-model semantics:
  - `player-local-cardinal4` for the character (`front / right / back / left`)
  - `diagonal4` for isometric objects (`NE / SE / SW / NW`)
  - `single` for one-image assets
- Updated the calibration panel so object rows are labeled directly as:
  - `光在右上 / NE`
  - `光在右下 / SE`
  - `光在左下 / SW`
  - `光在左上 / NW`
- Added clearer usage hints explaining how to calibrate.
- Kept moving-player testing intact.
- Updated start scripts and on-screen version to port 8146.

## Sanity checks

- `node --check app.js` passed.
- Packaging completed successfully.
