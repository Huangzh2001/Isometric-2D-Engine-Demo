# Asset-Management Fail-Fast Cleanup Task

## Goal
Enforce fail-fast behavior for legacy asset-management paths so that all asset import and resource access logic must resolve through `src/infrastructure/assets/asset-management.js`.

## What was implemented
- Added ownership markers to critical asset-management exports.
- Added `assertAssetManagementOwnership(context)` to validate that runtime exports are owned by `src/infrastructure/assets/asset-management.js`.
- Added unified fail-fast error tag: `[LEGACY-ASSET-PATH-CALLED]`.
- Added startup ownership assertion in `src/presentation/shell/app.js`.

## Critical exports covered
- `scanAssetPrefabs`
- `getAssetPrefabScanSnapshot`
- `ensureAssetPrefabScanState`
- `loadCustomPrefabsFromLocalStorage`
- `saveCustomPrefabsToLocalStorage`
- `refreshPrefabSelectOptions`
- `fetchHabboAssetRootConfig`
- `fetchHabboLibrarySummary`
- `fetchHabboLibraryPage`
- `fetchHabboLibraryIndex`
- `fetchHabboAssetFileBuffer`

## Behavior
If any critical export is missing or is no longer owned by `src/infrastructure/assets/asset-management.js`, the app throws an error with `[LEGACY-ASSET-PATH-CALLED]` immediately.

## Validation
- App should open normally.
- Prefab list should load.
- Habbo library should work.
- Logs must not contain `[LEGACY-ASSET-PATH-CALLED]`.
