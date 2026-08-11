# Validation v4.16.8

## Passed
- `node --check app.js`
- `node test_math.js`: 6/6 PASS
- `keyframemorph` renderer calls `drawKeyframeGroundSdfMorphOnFloor(..., light)` and uses rotational transport around caster z=0 before SDF blend.
- Exact keyframe renderer remains `drawExactKeyframeShadowOnFloor()` and was not replaced.
- Shadow Hull stationary raster is 1:1 (`step=1`), drag preview is 1/2 (`step=2`).
- Shadow Hull ray intersection uses adaptive SDF-distance bounded subdivision; no random jitter/dither is used.
- Point light and directional light share the same adaptive Shadow Hull intersection path.
- `buildingTiles` display anchor uses bottom isometric diamond centre (`bottom - width/4`) aligned to world z=0.
- `start.bat`, `launcher.py`, title, badge and app/style/math cache keys all identify v4.16.8.

## Browser note
The container Chromium installation rejects local/file workbench pages with `chrome-error://chromewebdata/`, so a real browser screenshot-level runtime validation cannot be claimed from this environment. Runtime errors remain surfaced by the existing in-page error overlay on the user's machine.
