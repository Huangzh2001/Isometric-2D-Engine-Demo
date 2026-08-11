# v4.18.0 — Matsushita Visual-Hull Guidance Warp

## Method A

This version replaces the previous sparse-feature / Beier–Neely experiment with an adaptation of **Matsushita et al., “Lighting interpolation by shadow morphing using Intrinsic Lumigraphs,” Pacific Graphics 2002, §4.4**.

The project already knows four calibrated isometric/orthographic source projections, their silhouettes, and four exact ground-shadow keyframes. Therefore the paper's multi-view-stereo geometry-estimation stage is replaced by a standard calibrated **Shape-from-Silhouette / Visual Hull** proxy:

\[
V=\bigcap_{i=0}^{3}\{P\mid \Pi_i(P)\in M_i\}.
\]

The proxy is used **only as motion guidance**.

For a current lighting state, the algorithm computes geometric guidance shadows

\[
G_A,\quad G_t,\quad G_B
\]

from the same Visual Hull under the two neighboring endpoint lights and the current target light.

Following §4.4 of the paper:

1. segment each guidance shadow into connected shadow blobs;
2. match source blobs to nearest target blobs;
3. estimate a 2-D affine transform for each corresponding blob using subimage registration;
4. attach exact endpoint-shadow components to endpoint guidance blobs by overlap;
5. apply the guidance affine transforms to the **exact endpoint shadows**, not to the final Visual Hull shadow;
6. blend the two already-registered endpoint masks for the intermediate state.

At every exact keyframe direction, Method A bypasses all guidance code and calls the original `drawExactKeyframeShadowOnFloor()` directly.

## Point light

Point lights use the actual 3-D light position only while generating `G_t`. The ground projection of a 3-D proxy point is the ordinary central projection through the light. The later blob registration and exact-mask warp are the same as for a directional light.

## What is from the paper vs. project adaptation

**Paper-derived structure:** geometric shadow guidance; region/blob correspondence; 2-D affine transformation by subimage registration; attachment of real shadow masks to geometric shadows; warp real masks according to geometric-shadow motion.

**Project adaptation:** calibrated silhouette Visual Hull replaces the paper's stereo depth geometry, because this project already has calibrated isometric projections and silhouettes. The paper does not prescribe a specific numerical affine-registration optimizer; this implementation uses second-moment initialization followed by symmetric binary-overlap refinement.

## Not used by active Method A

- Height Proxy
- voxel shadow intersection
- sparse 3-D contour-feature triangulation
- Beier–Neely field morphing
- literal 2-D shadow rotation

Shadow Hull remains available independently as Method B.
