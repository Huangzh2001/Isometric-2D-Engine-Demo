# Reuse provenance

Base: `Isometric-2D-Engine-Demo-sprite-shadow-segmented-depth-v17.zip`

## Byte-for-byte copied

- `reused/view-rotation-core.js`
  - source: `src/core/domain/view-rotation-core.js`
- `reused/render-hit-test.js`
  - source: `src/presentation/render/interaction/render-hit-test.js`

## Extracted from v17 and generalized

- `reused/axis-drag-core.js`
  - source: `src/presentation/lighting/lighting-editor.js`
  - reused concepts/functions: `axisHandle`, `hitLightAxis`, projected-axis drag delta
  - generalized from one light to any selected world entity.
- `reused/original-voxel-shadow-math.js`
  - source: `src/presentation/render/logic.js`
  - reused: `shadowProjectionDirection`, `projectPointToPlaneAlongShadow`, convex-hull idea, box corner representation.

## New experimental code

- `math.js`: sprite-alpha inverse projector for directional/point lights.
- `app.js`: small laboratory scene, receiver rasterization, direct scene interaction.
