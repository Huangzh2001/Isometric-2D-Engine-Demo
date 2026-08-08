# PXM-07.18O2 Audit Notes

## Scope

This is a deliberately small follow-up to PXM-07.18O1. It does not change PixiJS rendering, framePlan generation, packet identity, chunk keys, RenderTexture reuse, sprite transforms, sorting, or Canvas2D fallback behavior.

Changed file:

- `src/infrastructure/logging/logging.js`

## Evidence from the previous log

The O1 log showed that the stable item-plan cache gate was fixed and fast-hit was active on most frames:

- `staticMaterializedPlanCacheEnabled=true` on all parsed frames
- `staticMaterializedPlanCacheHit=true` on most frames
- `staticStableItemPlanFastHit=true` on most hit frames
- `staticPacketItemLoopMs` dropped substantially compared with O/previous logs

However, the log also showed:

- `pixiPerformanceMode.enabled=false`
- exported log count was extremely high
- high-frequency noise was dominated by `[P3][BOUNDARY]`, `[SCENE-SESSION][WRITE]`, and generic `[pixi-migration]` lines

That means the render optimization was partly working, but the performance measurement remained polluted by log retention and UI-log churn.

## Existing implementation checked before modifying

Existing logging implementation already had:

- `pixiPerformanceMode` localStorage flag
- `__PIXI_PERFORMANCE_LOG_MODE__` runtime API
- `setPixiPerformanceModeEnabled()`
- compact log budgets when performance mode is explicitly enabled
- suppression for generic Pixi migration/camera/render-order diagnostic lines

The missing behavior was not a new logging system. The missing behavior was that performance log mode defaulted to disabled unless localStorage explicitly contained `1`/`true`.

## What changed

### 1. Performance log mode defaults to enabled

`readPixiPerformanceModeFlag()` now returns enabled by default when no explicit localStorage override exists.

Explicit overrides are still respected:

- `localStorage.setItem('pixiPerformanceMode', '0')` disables it
- `localStorage.setItem('pixiPerformanceMode', 'false')` disables it
- `localStorage.setItem('pixiPerformanceMode', '1')` enables it
- `localStorage.setItem('pixiPerformanceMode', 'true')` enables it

### 2. Compact log budget applies automatically

When performance log mode is enabled, the log buffer budget is constrained to the existing compact values:

- `MAX_LOG_LINES <= 12000`
- `LOG_UI_PREVIEW_LINES <= 500`

This uses the existing budget variables and does not add a parallel logging buffer.

### 3. High-frequency noise suppression is expanded

The existing suppression path now also suppresses:

- `[P3][BOUNDARY]`
- `[SCENE-SESSION][WRITE]`
- generic `[pixi-migration]` lines

The following diagnosis lines are explicitly preserved:

- `forensics-frame`
- `forensics-static-world`
- `begin-frame-phase-diagnostics`
- `PIXI-RESIDUAL-CANVAS2D-FORENSICS`
- `DRAW-LOOP-BREAKDOWN`
- `staticStableItemPlanCacheGate`
- `optimization-placement-audit`
- `order-run-cache-evidence`
- `[log-channel-diag]`
- warnings/errors/failures

## Why this is not duplicate work

This does not add a second logger, second debug buffer, or second performance mode. It reuses the existing centralized logging module and existing `pixiPerformanceMode` API.

## Expected verification in the next log

The next exported log header should show:

```text
# pixiPerformanceMode={"version":"PXM-07.18O2","enabled":true,..."defaultEnabled":true,...}
```

Expected behavior:

- `suppressionCount` should be greater than zero
- `keptCount` should be much smaller than the previous 200k+ retained lines
- key forensics lines should still be present
- stable item-plan cache fields should still be present

If the app is still visibly choppy after this, the next investigation should focus on stable-plan miss reasons and the remaining `staticPacketItemLoopMs` / `chunkRenderTextureFrameMs` spikes, not on log-volume pollution.
