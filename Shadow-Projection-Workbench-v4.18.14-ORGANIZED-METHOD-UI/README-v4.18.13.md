# Shadow Projection Workbench v4.18.13 — AABB-constrained Analytic Direct Shadow Hull

This build adds one independent experimental shadow mode without replacing or deleting any previous method:

`AABB-constrained Direct Shadow Hull`

Mathematically:

\[
H^*=B\cap C_1\cap C_2\cap C_3\cap C_4.
\]

- `C1..C4`: the same four calibrated source-silhouette volumes used by the existing Direct Shadow Hull.
- `B`: the runtime collision/proxy AABB returned by `vhCasterBounds(spec)`.
- benchmark hidden 3D geometry (`BENCHMARK_GEOMETRY`) is not used by this algorithm.

## Query

For a shadow ray `r(s)`:

1. keep the original `shadowHullRaySegment(...)` light-ray construction;
2. clip it against the runtime AABB with `vhRayBoxRange(...)`;
3. use the original continuous alpha=.5 source contours and analytic line/contour interval intersections;
4. intersect the AABB interval with all four silhouette intervals;
5. shadow iff the final interval is non-empty.

No SDF tolerance and no SDF ray marching are used in this new mode.

## Exact keyframes

At the four calibrated directional keyframes the new mode bypasses the hull query and directly calls the existing exact renderer:

`drawExactKeyframeShadowOnFloor(...)`

so `S(theta_i) = S_i` by construction.

## Compatibility

The original Direct Shadow Hull core is preserved bit-for-bit. `reconstruct`, Consensus Support, exact keyframe rendering, and the other experimental modes remain available in the UI.

See `VALIDATION-v4.18.13.md` for the A/B/C benchmark.
