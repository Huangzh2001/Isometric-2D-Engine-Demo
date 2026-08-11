# v4.18.8 — Direct Shadow Hull standalone + HIGH-AA

- `Direct Shadow Hull` is a standalone selectable continuous-shadow algorithm and is the initial mode in this build.
- Uses the accelerated analytic continuous-contour interval intersection from v4.17.2; no voxel VH, MLS, affine morph, SDF morph, optical flow, blur, dilation, or closing in this path.
- Four calibrated directional endpoints bypass the novel-view hull query and use the original exact `alpha=0.5` vector-contour renderer, enforcing `S(theta_i)=S_i` by construction.
- Dragging and static use identical Direct Shadow Hull geometry. Boundary pixels use deterministic adaptive 4x4 subpixel coverage AA in both states.
- Exact keyframe contour rendering also no longer drops to 1x supersampling while dragging.
- The older four-way ray transport remains a separate experimental option and is not part of Direct Shadow Hull.

## Benchmark warning

The v4.18.7 100-model baseline used 192/256-square pixel-center binary evaluation grids. It is useful for diagnosing the large phantom-volume / false-positive trend, but its exact edge-sensitive IoU/Chamfer/Hausdorff values must not be treated as a final subpixel-quality benchmark. A final edge-precision benchmark must use the same high-resolution coverage/supersampling for prediction and GT, or continuous geometry. Runtime HIGH-AA in this release is independent of that older benchmark rasterization.
