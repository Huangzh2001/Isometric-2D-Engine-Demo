# PXM-07.18O1 audit notes

## Purpose

This is a narrow gate fix after the PXM-07.18O debug log showed that the fast-hit stable item-plan path was never exercised.

The log evidence was:

- `pixiPerformanceMode.enabled=false`
- `staticMaterializedPlanCacheEnabled=false`
- `staticMaterializedPlanCacheReason=disabled-or-diagnostics-active`
- `staticStableItemPlanFastHitEnabled=true`
- `staticStableItemPlanFastHit=false`
- `staticPacketItemLoopMs` remained high while the static packet count stayed around 2505--3799.

Therefore the immediate bottleneck diagnosis is unchanged: the renderer is still scanning thousands of static packets per frame before Pixi draws only a few dozen static draw units. PXM-07.18O could not prove or disprove the fast-hit optimization because the cache gate blocked it.

## Existing implementation checked before modifying

The fix preserves the existing optimization hierarchy:

- `staticPacketItemBaseCache` remains the authoritative cache for projected geometry, chunk texture signatures, and draw data.
- `chunkEligibilitySplitCache` remains the split cache.
- `orderRunPlanCache` remains the player-sensitive order-run cache.
- chunk RenderTexture cache remains the GPU drawing cache.
- no framePlan, depth sorting, packet identity, RenderTexture grouping, sprite placement, or camera transform logic was changed.

## What changed

Only the stable item-plan cache gate changed:

- before: `staticMaterializedPlanCacheEnabled` required `pixiPerformanceMode=true`, non-verbose static diagnostics, and suppressed chunk-input diagnostics;
- now: the stable item-plan cache is enabled by default unless explicitly disabled with localStorage or verbose static diagnostics is active.

`pixiPerformanceMode` is now treated as a log-volume mode, not as a required gate for this performance optimization.

## Why this is not a new duplicate cache

No new rendering cache was introduced. PXM-07.18O1 only allows the already-added stable item-plan cache to run in normal debug-log sessions. It still reuses the existing lower-level caches and does not cache frame-dependent output.

The cache still does not store:

- sprite placement;
- renderTransform output;
- screen-space bounds;
- Pixi texture objects;
- current-frame order item references;
- newly generated projected geometry or drawData.

## New diagnostics to check

The next log should include:

- `staticStableItemPlanCacheGate`
- `staticStableItemPlanCacheBlockedBy`
- `staticStableItemPlanCacheGateMode`
- `pixiPerformanceModeEnabled`
- `verboseStaticDiagnosticsEnabled`
- `chunkInputDiagnosticsSuppressedForStablePlan`
- `stableItemPlanCacheRequiresPerformanceMode`

Expected result for normal debug-log capture:

- `staticStableItemPlanCacheGate=enabled`
- `stableItemPlanCacheRequiresPerformanceMode=false`
- `staticMaterializedPlanCacheEnabled=true`

Expected performance evidence after warm-up:

- `staticMaterializedPlanCacheHit=true`
- `staticStableItemPlanFastHit=true`
- `staticStableItemPlanFastSplitHit=true`
- lower `staticPacketItemLoopMs`
- lower `chunkEligibilitySplitMs`

## Remaining known limitation

This still does not solve the larger architectural issue: Pixi static-world adoption still happens after framePlan has already produced thousands of `static-world-face-packet` entries. PXM-07.18O1 only verifies and uses the smallest safe fast-hit path. If logs show the cache is enabled and hits but the app remains slow, the next bottleneck should be measured before any further change.
