# v4.18.13 validation — AABB-constrained Analytic Direct Shadow Hull

## Scope

The current runtime contains 100 programmatic GT benchmark models. The older external 527-model geometry/generator is not present in this runtime, so this report does **not** claim a 527-model run.

A/B/C are evaluated on the same model, light and output raster:

- A — original Direct analytic Shadow Hull: `C1 ∩ C2 ∩ C3 ∩ C4`
- B — existing `reconstruct`: runtime AABB + SDF/ray marching (`tol=.18`)
- C — new AABB-constrained analytic Direct Shadow Hull: `B ∩ C1 ∩ C2 ∩ C3 ∩ C4`

For midpoint/sweep/point comparisons the evaluation raster is 96×96 pixel-center sampling for all A/B/C. Midpoints preserve the calibrated 35.264° elevation and use the 45° azimuth halfway between adjacent keyframes.

## Hard constraints

Runtime AABB source reported by the new method:

`vhCasterBounds-runtime-metadata`

The new AABB query path does not consult `BENCHMARK_GEOMETRY`.

At K0/K1/K2/K3 all four runtime checks returned:

`projection = exact-source-silhouette-contour-same-math`

and:

`aabbDirectShadowHullEndpointBypass = true`

Therefore exact directional endpoints use the same existing renderer and are equal by construction.

## Original Direct Shadow Hull source protection

The following original v4.18.12 functions are byte-identical in v4.18.13:

- `buildShadowHullBundle` — `22f9e7f05ed5de19f7d03d9774e3ab397a548c18ef9bf3e643bbbe08c190d9ea`
- `shadowHullRaySegment` — `16d1a2e65b8d641085b2621664c23e19442f5d99cf163300dd18bedfc038809f`
- `shadowHullRayHit` — `e377e92ce74be312c9eccd80107b8d6d367422f2ffdd841b077e5debce748a4d`
- `drawKeyframeShadowHullOnFace` — `eceb0261b4a5818abc0b52d1633a2bc4ca0fc4a3d2362205678ff65cc39efed9`
- `contourLineInsideIntervals` — `79560f81c7572619644355f61b1fdb3449d786973a045e2564c8bd86b1be28f8`
- `intersectIntervalSets` — `37b2b9eb93b661cf01b67c92ff12d5220e6e6d39c9dceb8ab7342046bab5241f`
- `exactKeyframeSourceContourLoops` — `d1132b2c2df6a8f68bfe41faac749bb6dfd9103cad77fe7d23d19c384f5f6db1`

## A/B/C results — 100 models

### Four 45° azimuth midpoints — 400 cases

| method | mean IoU | median IoU | FP/GT | FN/GT | area ratio |
|---|---:|---:|---:|---:|---:|
| A Direct analytic | 0.3560 | 0.3308 | 1.0806 | 0.3203 | 1.7604 |
| B reconstruct | 0.3979 | 0.3973 | 1.0801 | **0.2709** | 1.8093 |
| C AABB analytic | **0.4066** | **0.4076** | **0.8300** | 0.3296 | **1.5004** |

C vs A paired:

- mean ΔIoU: **+0.05065**
- median ΔIoU: +0.01024
- improved: **355/400 = 88.75%**
- worsened: **21/400 = 5.25%**
- ΔIoU < -0.02: 2/400
- ΔIoU < -0.05: 0/400
- worst regression: **-0.02496**

C vs B midpoint mean ΔIoU: **+0.00869**. C has the higher mean, but B wins slightly more individual cases (215/400 vs 185/400), so neither dominates the other case-by-case.

### 360° azimuth sweep — 24 non-keyframe samples/model = 2400 cases

| method | mean IoU | median IoU | FP/GT | FN/GT |
|---|---:|---:|---:|---:|
| A Direct analytic | 0.2429 | 0.2236 | 0.9555 | 0.5524 |
| B reconstruct | **0.2535** | **0.2324** | 1.0454 | **0.5284** |
| C AABB analytic | 0.2461 | 0.2239 | **0.8322** | 0.5823 |

C vs A:

- mean ΔIoU: +0.00316
- improved: 59.88%
- worsened: 30.08%
- worst regression: -0.06228

B remains ahead of C by about 0.00743 mean IoU on this sweep.

### Point lights — near / middle / far = 300 cases

| method | mean IoU | median IoU | FP/GT | FN/GT |
|---|---:|---:|---:|---:|
| A Direct analytic | 0.1664 | 0.1514 | 1.0158 | 0.6711 |
| B reconstruct | **0.1796** | **0.1572** | 1.0831 | **0.6491** |
| C AABB analytic | 0.1706 | 0.1471 | **0.8631** | 0.6974 |

C vs A:

- mean ΔIoU: +0.00414
- improved: 76.0%
- worsened: 21.67%
- worst regression: -0.03477

B remains ahead of C by about 0.00905 mean IoU for point lights.

Point-light C means: near 0.1864, middle 0.1585, far 0.1668.

## Interpretation

The hard AABB constraint is clearly useful: at the hardest fixed-elevation midpoints it removes a large amount of false-positive phantom shadow and raises mean IoU from 0.3560 to 0.4066 while preserving the analytic contour/interval machinery.

However, C does not yet replace `reconstruct` globally. `reconstruct` still has lower FN and higher mean IoU over the broad 360° sweep and point-light tests. That remaining difference is consistent with the SDF tolerance/ray-marching path accepting slightly more geometry: it raises FP but reduces FN.

Therefore v4.18.13 keeps all three methods. The benchmark supports **AABB hard constraint as a valuable factor**, but does not support deleting `reconstruct` yet.

## Absolute-score caveat

These current in-engine benchmark assets use actual 128×128 raster source silhouettes. The older standalone synthetic benchmark used continuous primitive silhouette geometry, so its historical absolute IoUs are not directly comparable.

Across the current 400 source views, the raster silhouette vs reprojected continuous benchmark geometry has mean IoU about **0.895**; thin categories are lower (lattice ≈0.786, sparse network ≈0.801). Four-way cone intersection amplifies those small source-boundary losses, especially for point lights. The A/B/C **paired comparisons remain valid** because all three methods receive the same source images and are scored against the same GT/raster.

To reproduce the requested historical 527-model test, the 527-model geometry/generator must be supplied; it is not present in the current project files.
