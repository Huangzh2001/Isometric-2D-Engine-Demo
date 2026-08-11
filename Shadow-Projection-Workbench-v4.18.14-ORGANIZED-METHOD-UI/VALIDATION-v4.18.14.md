# v4.18.14 validation — Organized Method UI

## Scope

UI organization, archived legacy UI entries, lazy asset-browser construction, packaging. No intentional shadow-algorithm changes.

## JavaScript syntax

- `node --check app.js`: PASS
- `node --check benchmark-geometry.js`: PASS
- reused JS files: syntax PASS

## Retained algorithm source protection

Compared with v4.18.13, the following function bodies are byte-identical (SHA-256 matched):

- `drawVoxelShadowOnFace`
- `viewBaselineShadowFrame`
- `buildHeightSliceProxy`
- `rtBuildModel`
- `drawExactKeyframeShadowOnFloor`
- `buildShadowHullBundle`
- `contourLineInsideIntervals`
- `intersectIntervalSets`
- `shadowHullRayHit`
- `drawKeyframeShadowHullOnFace`
- `drawAabbConstrainedShadowHullOnFace`
- `vhConstraintViews`
- `vhRayHitsVisualHull`
- `buildConsensusProxy`

## Browser/UI test

Because this container blocks native `file://`/localhost navigation, the actual v4.18.14 HTML/CSS/JS files were loaded into Chromium through Playwright DOM/script injection. No source substitutions were used.

Results:

- page/runtime errors: 0
- console errors: 0
- five visible families all switch to the expected runtime modes
- four 3D-reconstruction subtypes all selectable on the benchmark model
- Consensus support slider visible only for `consensus` and updates state
- height-map inspection button visible for height method
- exact-keyframe quick bar visible for the exact-keyframe inspection subtype
- archived legacy method container is hidden

## Startup optimization check

- asset selector options at startup: 125
- `.assetCard` thumbnail nodes before opening asset browser: **0**
- `.assetCard` nodes after first opening asset browser: **125**

This removes the previous eager construction/decoding of the complete thumbnail grid from the startup path.

## Visual inspection

Screenshot: `v41814-organized-ui.png` (kept outside the runtime ZIP to avoid package bloat).

The top toolbar now shows two compact controls:

- 阴影方法
- 子类型

The five method families are visible at the top level; old rejected/legacy experiments are not shown in the normal UI.
