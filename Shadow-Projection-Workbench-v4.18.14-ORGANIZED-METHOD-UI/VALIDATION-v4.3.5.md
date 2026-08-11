# v4.3.5 validation

## Static checks

- `node --check app.js`: PASS
- `node test_math.js`: 6/6 PASS

## Pyramid shrink-wrap sanity check

Using the bundled `assets/pyramid_ne.png` (128×128), calibration:

- anchor = (64, 108)
- visualW = 2.20
- visualH = 2.05
- placement outer square = 2.0 × 2.0

A direct offline reproduction of the view-0 ground-square projection plus bottom-envelope collision gives the first stable contact at approximately:

- shrink scale ≈ 0.969
- inferred square side ≈ 1.94 world units

For the default directional light, the corresponding center chord perpendicular to the horizontal light direction is approximately 2.52 world units long.

This validates that the test pyramid is classified as a **wide-base** object rather than collapsing to its single lowest raster tip.

## Caveat

No successful browser screenshot/runtime visual acceptance test was produced in this environment. The package has static syntax/math checks and an offline geometry sanity check only.
