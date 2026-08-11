# v4.2.2 validation

## Fixed

1. Calibration panel uses `top/right/bottom` constraints and `overflow-y:auto`; controls cannot extend beyond the stage vertically.
2. Keyboard movement is processed before the select/button focus guard. This fixes the v4.2.1 failure where clicking a calibration control left focus on that control and WASD/arrow input was ignored.
3. Added pointer-held movement pad for player testing.
4. Movement continues to drive the existing animation-frame loop and per-frame shadow re-render.

## Checks

- `node --check app.js`: PASS
- `node test_math.js`: PASS (6/6)
