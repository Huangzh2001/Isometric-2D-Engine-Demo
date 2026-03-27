# Logging Refactor Task

## Goal
Extract the main program logging system into `src/logging/logging.js` and centralize runtime logging, route logging, warnings, errors, and fail-fast diagnostics without changing functional behavior.

## Allowed Changes
- Add `src/logging/logging.js`
- Move shared logging state and helper functions out of `src/state.js`
- Add a minimal script include in `index.html`
- Reconnect existing call sites to the new logging entry points
- Add documentation under `docs/`

## Forbidden Changes
- Do not change scene-storage responsibilities
- Do not change asset-management responsibilities
- Do not change lighting, player, collision, placement, or editor behavior
- Do not change prefab/scene schemas
- Do not convert the project to ES modules
- Do not remove existing debugging capability

## Implementation Notes
- Keep old global function names available for compatibility (`pushLog`, `detailLog`, `exportLogs`, etc.)
- Keep existing log prefixes compatible, including route/fail-fast prefixes
- Prefer minimal extraction over broad cleanup

## Acceptance Criteria
- Main program opens normally
- Prefab list still works
- Habbo library still works
- Scene save/load still works
- Existing route logs and fail-fast logs still appear
- Future developers can locate logging responsibilities in `src/logging/logging.js`
