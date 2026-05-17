# PXM-07.18N Audit Notes

## Goal

Keep the PixiJS/GPU migration path and reduce the measured CPU bottleneck without reintroducing the unsafe static input-plan cache that caused camera-drag displacement in PXM-07.18K2.

## Evidence from the submitted log

The submitted `isometric-debug-log-1778823309654` log showed:

- `staticPacketCount` median: about 4298 packets per frame.
- `actualStaticDrawUnitCount` median: about 41 Pixi draw units.
- `chunkRenderTextureHitRate` median: 1.0.
- `staticPacketItemLoopMs` median: about 46.7 ms, p95 about 53.2 ms.
- Residual Canvas2D draw loop was about 0.4 ms and `staticPacketCanvasFallbackPacketCount` was 0.

Conclusion: the main bottleneck is not Canvas2D fallback and not Pixi draw count. The bottleneck is the per-frame CPU materialization loop that scans and rebuilds bookkeeping for roughly 4298 static packets before Pixi draws about 41 GPU units.

## Existing implementations checked

### 1. `staticPacketItemBaseCache`

Location: `src/presentation/render/optimization/shared-render-optimization-pixi-static-world-packet-consumer.js`.

Purpose: caches packet-level projected geometry, chunk texture signature, and draw data.

Decision: reuse it as the authoritative lower-level cache. PXM-07.18N does not duplicate projected geometry or draw data.

### 2. `chunkEligibilitySplitCache`

Location: same Pixi static-world consumer.

Purpose: caches the split between external chunk-cache packets and player-sensitive packets.

Decision: reuse it after stable item-plan materialization. It cannot remove the earlier 4298-packet item loop because it operates after the item list has already been built.

### 3. `orderRunPlanCache`

Location: same Pixi static-world consumer.

Purpose: caches player-sensitive order-run grouping.

Decision: reuse it. It is not a substitute for the global static item plan because it covers only player-sensitive order-run grouping.

### 4. `playerMoveFastPath`

Location: `src/presentation/render/frame/player-move-fast-path.js`.

Purpose: reuses static renderable order for player movement.

Decision: checked but not directly usable as a Pixi static item-plan cache. It does not provide Pixi draw data, projected geometry handles, or `staticPacketItemBaseCache` keys.

### 5. Static-world GPU chunk-cache input planner

Location: `src/presentation/render/optimization/static-world-gpu-chunk-cache-input.js`.

Purpose: diagnostic/input planning for GPU chunks.

Decision: checked but not a render-plan cache. It is diagnostic/input-oriented and does not own Pixi draw item materialization.

## New code and why it is necessary

PXM-07.18N keeps the old name `staticMaterializedPlanCache` for compatibility with existing diagnostics, but its policy is changed:

- It caches only a stable item plan: packet references, existing `staticPacketItemBaseCache` keys, and order metadata.
- It does not cache projected geometry, draw data, render transform, screen-space bounds, sprite placement, or materialized chunk item objects.
- On cache hit, it re-materializes lightweight frame items by looking up existing `staticPacketItemBaseCache` entries.

Why this is needed: no existing cache stores the stable sequence of static packet base-cache keys before chunk split. Without this thin plan, the Pixi path must rebuild base-cache keys and perform per-packet bookkeeping for about 4298 static packets every frame.

## Safety constraint

The unsafe PXM-07.18K2 cache failed because it cached frame-materialized objects tied to camera/transform state. PXM-07.18N avoids that by not caching frame-dependent objects.

Frame-dependent fields explicitly not cached:

- screen-space bounds
- localized draw commands
- sprite x/y placement
- render transform dx/dy
- camera x/y
- current-frame order item references

## Expected diagnostic result

After the first miss/build frame, repeated stable frames should show:

- `staticMaterializedPlanCacheHit = true`
- `staticMaterializedPlanCacheReason = hit-stable-item-plan-reused-existing-static-bases`
- lower `staticPacketItemLoopMs`
- `chunkRenderTextureHitRate` still near 1.0
- `actualStaticDrawUnitCount` still around the previous value, not exploding

If `staticMaterializedPlanCacheLookupMs` becomes large, the next confirmed bottleneck is the stable-order hash computation. The proper fix would then be to move that hash/signature generation upstream into the frame-plan/static-packet producer, not to create another render cache.
