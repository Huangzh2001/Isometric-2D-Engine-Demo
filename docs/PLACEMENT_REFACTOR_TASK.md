# Placement Refactor Task

## Goal
Extract the main program's placement subsystem into an independent module and centralize prefab instance placement, instance creation/removal, placement preview commit flow, and the basic ordering trigger entry for scene objects, without changing the current behavior.

## Allowed Changes
- Add `src/application/placement/placement.js`.
- Move placement-related entry logic into that file.
- Keep compatibility wrappers where necessary.
- Add the minimum required script reference in `index.html`.
- Add documentation under `docs/`.

## Forbidden Changes
- Do not modify lighting, player movement, or collision responsibilities.
- Do not rewrite the object ordering algorithm itself.
- Do not rewrite the render pipeline.
- Do not change scene/prefab data structures.
- Do not change UI behavior.
- Do not introduce ES modules or third-party dependencies.

## Implementation Notes
- This round is about extraction and concentration, not redesign.
- Keep behavior stable.
- If ordering logic is tightly coupled to render/logic, only move the placement-side trigger/entry and keep the algorithm body where it already lives.
- Preserve old global entry names where needed to reduce risk.

## Acceptance Criteria
- Main program opens correctly.
- Prefab list still works.
- Placement mode still works.
- Scene objects can still be placed.
- Existing move/delete flows still work if they existed before.
- Scene save/load remains unaffected.
- Habbo placement remains unaffected.
- Later developers can find placement entry logic in `src/application/placement/placement.js`.
