# v4.17.8 — Endpoint-Constrained Field Morph

## Hard invariant
For directional-light continuous method A, the four exact keyframe directions are not re-rendered by the morph system. They call the original exact keyframe renderer directly:

`drawExactKeyframeShadowOnFloor()`

Therefore at each keyframe direction:

`S(theta_i) = S_i` exactly.

## Continuous interval
Only the open interval between adjacent exact keyframes uses Beier–Neely reverse field morphing.

Sparse feature trajectories are computed from light-aware projection, then calibrated to the two exact endpoint features:

`q(t) = q_hat(t) + (1-t)(q_A-q_hat_A) + t(q_B-q_hat_B)`

This enforces `q(0)=q_A` and `q(1)=q_B` even when sparse triangulation has reprojection residual.

## Directional light
The current light chooses the azimuth interval and interpolation parameter. Projection within method A follows the exact keyframe rays themselves: azimuth and elevation are interpolated in spherical coordinates. If the two keyframes have equal elevation, the entire interval keeps that elevation.

This prevents the free sun handle's unrelated elevation from changing the four-keyframe animation.

## Point light
Point light remains central projection for sparse feature trajectories. Endpoint residual calibration is still applied, but point-light shadows are not falsely claimed to be identical to directional keyframe shadows.
