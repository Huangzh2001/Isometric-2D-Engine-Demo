# VALIDATION v4.17.1

- `node --check app.js`: PASS
- `node test_math.js`: PASS 6/6
- analytic interval micro-tests: PASS
  - line crossing square -> exact interval [1,2]
  - line fully inside -> full interval retained
  - line fully outside -> empty
  - diagonal crossing -> exact interval [1,2]
- Shadow Hull runtime metadata: `analytic-source-contour-shadow-hull-point-aware`
- Shadow Hull `shadowHullRayHit()` no longer samples `ground-SDF` and no longer performs adaptive ray marching.
- Point-light dragging remains full-resolution; only edge AA changes from static 3x3 to drag 2x2.
- The static exact keyframe contour implementation from v4.17.0 is preserved.

Note: this environment did not provide a reliable browser-level visual render of the local workbench, so final visual acceptance must be judged in the user's browser. The exported debug metadata is designed to verify which projection path is actually active.
