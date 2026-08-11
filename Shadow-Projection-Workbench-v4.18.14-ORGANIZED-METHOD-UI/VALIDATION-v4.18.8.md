# v4.18.8 validation — Direct Shadow Hull standalone + HIGH-AA

## Scope

This is a **standalone Direct Shadow Hull quality-evaluation build**. It does not claim the Direct Shadow Hull geometry is already fast enough for production 60-fps dragging.

## Algorithm routing

`shadowMode=shadowhull` directly calls the accelerated analytic continuous-contour Shadow Hull query. The separate four-way ray-transport path remains available as an experimental button but is not part of Direct Shadow Hull.

Direct Shadow Hull path excludes voxel VH, MLS, affine morph, optical flow, SDF morph, blur, dilation, and morphology closing.

## Exact endpoints

10 project assets with four calibrated keyframes were tested. All 10 tested directional endpoint renders reported:

`exact-source-silhouette-contour-same-math`

Direct Shadow Hull explicitly bypasses its novel-view query at calibrated directional endpoints and calls the original exact vector-contour renderer. This enforces `S(theta_i)=S_i` by construction.

## Anti-aliasing

Direct Shadow Hull novel views use:

`full-resolution analytic centers + adaptive 4x4 edge coverage AA`

Only boundary pixels receive the 4x4 subpixel ray queries. Interior pixels retain the single analytic query. There is no blur, dilation, closing, or shadow-thickening filter.

Dragging and static use identical geometry and identical AA. The raster cache key no longer distinguishes drag/static. On toilet, chair, pyramid, tree, and lamp at the same directional midpoint, drag/static canvas screenshots had **0 differing pixels**.

Exact keyframe vector contours also no longer drop to 1x supersampling during drag.

## Browser regression

Assets tested:

- toilet
- chair
- pyramid-test
- tree-local
- lamp-local
- statue-local
- taxi-oct8
- terrain-channel-low
- terrain-channel-wall
- terrain-channel-slope

For each: exact directional endpoint, directional midpoint, point-light midpoint. Browser runtime errors: **0**.

## Runtime cost in the container Chromium/CPU environment

High-quality Direct Shadow Hull midpoint computation (not including cached release redraw):

- directional mean: ~83.2 ms; max: ~171.7 ms
- point mean: ~90.7 ms; max: ~196.5 ms

Thus this release is intended for visual/algorithm evaluation. The high-AA Direct Shadow Hull path is not yet claimed to be 60-fps production-ready on complex assets.

## Benchmark rasterization warning

The v4.18.7 100-model Direct Shadow Hull baseline used 192/256-square pixel-center binary grids. It is useful for diagnosing finite-view phantom geometry and the strong false-positive/superset signature, but its exact edge-sensitive IoU / Chamfer / Hausdorff numbers are **not** treated as final subpixel-precision scores in this release.

A final precision benchmark must rasterize **both prediction and ground truth using the same high-resolution coverage/supersampling**, or compare continuous geometry directly. Runtime 4x4 display AA must never be used to artificially inflate benchmark overlap.
