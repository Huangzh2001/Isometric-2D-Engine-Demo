# v4.10.0 algorithm reference

## 1. 四视图重建算法：普通物体

The non-terrain reconstruction path follows the image-based visual-hull / shape-from-silhouette formulation specialized for fixed orthographic/isometric game sprites.

For a receiver point `Q`, restrict its shadow ray `R(t)` to the caster AABB. A ray point belongs to the visual hull when all calibrated source silhouettes contain the same 3D point:

`max_i D_i( Pi_i( R(t) ) ) <= tolerance`

where `D_i` is the precomputed EDT signed-distance field of source view `i`.

The implementation performs conservative 1D SDF-guided stepping and adaptive 4×4 edge supersampling. No 3D occupancy volume is allocated.

Reference implementations inspected during development:

- `avanindra/EPVH` — implementation of *Exact Polyhedral Visual Hulls* (Franco & Boyer, BMVC 2003), useful for calibrated contour/camera geometry.
- `HelliceSaouli/GIBVH` — GPU Image-Based Visual Hull / GPU volume-carving implementation, useful as a reference for parallel silhouette queries.

No code from those repositories is copied into this workbench.

## 2. Terrain refinement

A silhouette-only visual hull cannot reconstruct a depression whose opening never changes the object alpha silhouette. The Kenney terrain groups therefore use a second classical multi-view geometry technique: **calibrated plane-sweep stereo / photometric consistency**.

For every XY sample and candidate world height `z`, the workbench projects a small world-aligned patch into all four source views and evaluates cross-view RGB consistency. The lowest plane within a tight margin of the best photometric score is selected, followed by confidence-gated median cleanup and edge-preserving smoothing.

The resulting height field is queried bilinearly during receiver-space shadow-ray testing. This branch remains non-ML and does not allocate a voxel volume.
