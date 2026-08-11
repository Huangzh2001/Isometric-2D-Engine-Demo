# VALIDATION v4.17.0

- `node --check app.js`: pass
- `node test_math.js`: pass
- static exact-keyframe renderer no longer uses ground SDF/grid sampling
- source silhouette contour threshold is exactly alpha = 0.5
- ground mapping is obtained by inverting the same `vhProjectPoint(view,Q)` restricted to z=0
- fill rule: even-odd, preserving holes/components
- no contour smoothing / morphology / component deletion
