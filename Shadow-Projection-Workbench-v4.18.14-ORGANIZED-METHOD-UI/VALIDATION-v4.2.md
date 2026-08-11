# v4.2 validation

## What changed

Adjacent shadow facings are no longer alpha-crossfaded. Each facing alpha mask is converted to a signed distance field (SDF); the signed distances are interpolated, then one contour is reconstructed and projected once.

## Regression tests

`node test_math.js` passes:
- view projection roundtrip x4
- direct XYZ drag math
- registration point -> caster anchor
- directional multi-height receiver source invariance
- point-light multi-height receiver source invariance
- legacy voxel height response

## Toilet four-facing morph scan

Using the actual `toilet_f0..f3.png` masks and the same base-registration alignment as runtime, each adjacent pair was sampled at 21 interpolation positions:

- 0 -> 1: max connected components = 1, area range 3076..3229 px
- 1 -> 2: max connected components = 1, area range 2924..3076 px
- 2 -> 3: max connected components = 1, area range 3076..3229 px
- 3 -> 0: max connected components = 1, area range 3140..3229 px

Thus the intermediate mask remains one silhouette throughout the tested morph path; it is not two semi-transparent silhouettes.
