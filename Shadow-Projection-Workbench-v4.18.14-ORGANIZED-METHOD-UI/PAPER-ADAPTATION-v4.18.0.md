# Paper adaptation map — v4.18.0

Reference: Yasuyuki Matsushita, Sing Bing Kang, Stephen Lin, Heung-Yeung Shum, Xin Tong, **Lighting interpolation by shadow morphing using Intrinsic Lumigraphs**, Pacific Graphics 2002, especially §4.4 “Computing shadow masks”.

## Directly adopted structure from §4.4

- sampled/reference shadow masks are preserved as appearance anchors;
- approximate geometry is used to predict geometric shadows under intermediate illumination;
- geometric-shadow change is represented by region-based 2-D transformations;
- shadow blobs are the registration units;
- nearest blobs are used as correspondences when no texture is available;
- each blob transform is a 2-D affine transform;
- real/exact shadow masks are attached to geometric shadows by overlapping regions;
- geometric-shadow transforms guide the warp of the real/exact shadow masks.

## Project-specific replacement of the geometry acquisition step

The paper estimates view-dependent geometry with multi-view stereo because it starts from real light fields.

This project already has calibrated isometric/orthographic projections `Pi_i` and source silhouettes `M_i`, so v4.18.0 obtains approximate guidance geometry with standard Shape-from-Silhouette:

`V = intersection_i { P | Pi_i(P) is inside M_i }`.

The existing continuous-contour Visual Hull / analytic ray-intersection implementation is reused only for guidance-shadow queries.

## Registration solver detail

The paper specifies subimage registration and a 2-D affine matrix but does not prescribe one numerical optimizer in §4.4. v4.18.0 uses:

1. centroid/covariance (second-moment) affine initialization;
2. symmetric source-to-target and target-to-source binary-region mismatch;
3. multi-scale coordinate-descent refinement over the six affine parameters.

This is an implementation of the paper's registration step, not a replacement shadow model.

## Endpoint invariant

At exact keyframe parameters, Method A bypasses the entire guidance pipeline and executes the original exact renderer. Visual Hull geometry never replaces the four exact shadows.
