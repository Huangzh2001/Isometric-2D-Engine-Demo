# Logging Guidelines

## Log Categories
- General runtime logs: user actions, state transitions, progress updates
- Route logs: explicit module-routing evidence such as `[route][asset-management] ...`
- Warning/error logs: unexpected but recoverable issues or direct failures
- Fail-fast logs: hard-stop diagnostics such as `[LEGACY-ASSET-PATH-CALLED] ...`
- Debug detail logs: verbose trace output used during diagnosis

## Preferred Entry Points
Use helpers from `src/logging/logging.js` when practical:
- `pushLog(...)`
- `detailLog(...)`
- `logWarn(...)`
- `logError(...)`
- `logRoute(scope, event, payload?)`
- `logFailFast(tag, message, extra?)`

## Prefix Conventions
- Route logging should preserve module scope in the prefix
- Fail-fast logging should use a stable uppercase tag in square brackets
- Exported logs should include entry metadata in the header

## Integration Rule
When extracting future systems, prefer routing their diagnostics through `logging.js` instead of introducing new ad-hoc console usage.
