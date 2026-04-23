# Placement fail-fast cleanup / ownership validation

## Goal
Ensure all critical placement exports resolve through `src/application/placement/placement.js` only.

## Changes allowed
- Add owner markers to critical placement exports.
- Add startup ownership assertion.
- Throw `[LEGACY-PLACEMENT-PATH-CALLED]` if any critical placement function is missing or overridden by another path.

## Changes forbidden
- Do not change player, lighting, render pipeline, or sorting algorithm behavior.
- Do not change scene or prefab schemas.
- Do not perform unrelated refactors.

## Critical exports checked
- `allocInstanceId`
- `makeInstance`
- `createPlacedInstance`
- `recomputeNextInstanceSerial`
- `expandInstanceToBoxes`
- `rebuildBoxesFromInstances`
- `refreshPlacementOrdering`
- `findInstanceById`
- `findInstanceForBox`
- `removeInstanceById`
- `removePlacedInstance`
- `defaultInstances`
- `defaultBoxes`
- `legacyBoxesToInstances`
- `startDragging`
- `movePlacedInstance`
- `placeCurrentPrefab`
- `commitPreview`
- `commitPlacementPreview`
- `cancelDrag`

## Validation
- App opens normally.
- Placement actions still work.
- Logs contain no `[LEGACY-PLACEMENT-PATH-CALLED]`.
- If the tag appears, the failing export name should be directly visible.
