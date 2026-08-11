# Validation v4.17.8

Passed:
- Node syntax check
- exact-keyframe spherical-coordinate directional path test
- endpoint-constrained sparse feature trajectory test
- exact endpoint renderer bypass static regression
- sparse feature triangulation / point projection / Beier–Neely math tests
- 6 legacy projection math tests
- contour accelerator equivalence
- keyframe pairing adjacency

Critical invariant:
- At exact directional keyframe endpoints the effective projection must be `exact-source-silhouette-contour-same-math`.
- Between endpoints it must be `beier-neely-endpoint-constrained-field-morph`.
