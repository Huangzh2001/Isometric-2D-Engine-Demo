# Validation v4.2.5 — 3x3 direction grid

## UI model

The calibration panel now uses a 3x3 direction grid with the center intentionally empty.

- Character (`player-local-cardinal4`):
  - top = Back
  - right = Right
  - bottom = Front
  - left = Left
  - four corners empty
- Isometric object (`diagonal4`):
  - NW / NE / SW / SE corners contain the four facing previews
  - N / E / S / W cells empty

Each populated cell displays the mapped source image and a local mapping selector. The two slots currently contributing to the v4.2 SDF shadow are highlighted and display their interpolation weights.

## Checks

- `node --check app.js` passed.
- `node --check math.js` passed.
- `node test_math.js` passed all six existing projection/drag/registration/light tests.
