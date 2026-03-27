# Placement Boundary

## Placement Is Responsible For
- Creating scene instances from prefabs.
- Removing scene instances.
- Expanding instances into boxes.
- Rebuilding placement-side box state after placement changes.
- Placement preview commit and drag commit/cancel entry points.
- Triggering placement-side ordering refresh entry points.

## Placement Is Not Responsible For
- The detailed object ordering algorithm.
- Render pipeline internals.
- Player-versus-object ordering.
- Lighting and shadow behavior.
- Scene persistence.
- Asset ingestion and library indexing.

## Boundary With Other Modules
- `render.js`: keeps preview computation, picking, and drawing.
- `logic.js`: keeps spatial math and ordering-related algorithmic helpers.
- `scene-storage.js`: keeps persistence and snapshot restore.
- `asset-management.js`: keeps asset source and prefab ingestion responsibilities.
- `logging.js`: keeps shared logging output and diagnostics.

## Why This Round Only Extracts Entry Points
Placement is highly coupled with render and logic. Rewriting the ordering algorithm in the same round would create too much risk. This round only isolates the placement-side lifecycle and the trigger points for ordering updates.
