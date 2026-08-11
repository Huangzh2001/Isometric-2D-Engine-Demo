# v4.10.0 validation

Required checks before packaging:

- `node --check app.js` passes.
- `node test_math.js` legacy regression suite passes.
- Active launch path contains no v4.8/v4.9 entry references.
- Reconstruction mode is named `reconstruct` / `四视图重建算法`; no active `rayvh` mode remains.
- Single-view reconstruction is disabled and contains no `classic-single-view` fallback.
- Real multi-view families accepted by reconstruction:
  - diagonal4: 4 real views;
  - player-local-cardinal4: 4 real views;
  - terrain-diagonal4: 4 real views;
  - oct8: 8 real views.
- Pyramid remains on the generic calibrated silhouette reconstruction path; the terrain plane-sweep branch is restricted to ground-tile terrain specs with `sourceGrid`.
- Kenney terrain reconstruction uses:
  - source grid 130×66;
  - base side wall 16px below z=0;
  - physical source rotation map `[0,2,3,1]`;
  - 48×48 XY samples;
  - 65 height planes;
  - four-view world-aligned RGB patch consistency;
  - bilinear height-field shadow-ray test;
  - adaptive 4×4 final edge supersampling.

## Offline terrain plane-sweep sanity check

Using the same 4-view registration and patch-cost rule on representative XY points:

- Terrain A center channel `(0,0)` -> reconstructed `h = 0.000`; side-bank samples `x=±0.35` -> `h ≈ 0.075` before spatial cleanup.
- Terrain B center channel `(0,0)` -> `h = 0.000`; side-bank samples `x=±0.35` -> `h ≈ 0.150`.
- Terrain C center channel `(0,0)` -> `h = 0.000`; side-bank samples `x=±0.35` -> `h ≈ 0.450`.

This specifically verifies that v4.10 no longer reconstructs the channel as one full-height alpha slab.
