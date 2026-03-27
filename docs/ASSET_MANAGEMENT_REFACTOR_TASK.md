# Asset Management Refactor Task

## Goal
Extract the main program's asset management and import logic into a dedicated module so that prefab loading, asset index refresh, Habbo resource access, and asset-library-facing integration are easier to maintain without changing runtime behavior.

## Allowed changes
- Add `src/asset-management/asset-management.js`
- Move asset-related logic into that file, including:
  - prefab index loading
  - prefab scan / refresh logic
  - Habbo root config read/write
  - Habbo library summary / page / index fetching
  - Habbo file buffer loading
  - prefab select refresh logic
  - custom prefab local persistence helpers
  - scene-facing Habbo prefab reference helpers
- Add a minimal script reference in `index.html`
- Preserve existing global function compatibility

## Forbidden changes
- Do not modify lighting logic
- Do not modify player movement logic
- Do not modify collision logic
- Do not modify sorting / occlusion behavior
- Do not modify scene-storage responsibilities or behavior
- Do not modify prefab schema
- Do not modify scene schema
- Do not modify API paths
- Do not rename data fields
- Do not modify editor logic
- Do not convert the app to ES modules
- Do not perform large-scale directory migration
- Do not refactor unrelated systems in the same round

## Implementation requirements
- Prefer extraction and concentration over redesign
- Keep runtime behavior stable
- Preserve existing function names where other files already call them
- Keep the new module as a single entry file for this round
- Treat Habbo as one current asset source, not the only future source

## Acceptance criteria
- Main program opens normally
- Prefab list loads normally
- Asset refresh still works
- Habbo root status still works
- Habbo library related actions still work
- Custom prefab loading from local storage still works
- No obvious new UI or runtime errors are introduced
- Future developers can find asset import / indexing logic in `src/asset-management/asset-management.js`
