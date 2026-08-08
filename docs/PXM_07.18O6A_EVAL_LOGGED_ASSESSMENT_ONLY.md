# PXM-07.18O6A-EVAL — Logged performance assessment only

## Purpose

This build does **not** change rendering behavior. It is based on PXM-07.18O6A and only adds a rolling static-world performance assessment line to the exported log before any next optimization step is attempted.

## Why this exists

O6A proved that chunk-level stable item-plan caching can reduce some global-miss spikes, but the overall median frame cost did not improve. Before changing cache logic again, the runtime log must report whether the next change is justified.

## New log channel

Search exported logs for:

```text
static-world-performance-assessment
```

Important fields:

```text
windowFrameCount
avgDrawWallMs
avgStaticPacketItemLoopMs
fastHitRate
fastHitAvgDrawWallMs
globalMissRate
globalMissAvgDrawWallMs
chunkAssistRateWithinGlobalMiss
chunkAssistGlobalMissAvgDrawWallMs
chunkNoHitGlobalMissAvgDrawWallMs
verdict
recommendedNextOptimization
safeChangePolicy
```

## Interpretation

- `chunk-cache-helps-miss-frames-next-gate-it-to-global-miss-only` means chunk-level cache is helping miss frames and the next safe step is to gate it so it runs only when the global stable-plan fast-hit misses.
- `global-miss-heavy-but-chunk-cache-not-hitting-diagnose-chunk-key-before-changing-render` means the chunk cache key is not stable enough and should be diagnosed before optimization.
- `stable-fast-hit-dominates-next-change-should-be-disabled-or-diagnostic-only` means the remaining cost is likely outside this chunk-plan path.
- Any verdict mentioning Graphics or RenderTexture churn means correctness or invalidation must be investigated first.

## Safety boundary

This build does not modify:

```text
framePlan
face merge
singleton order-run RT fix
chunk RenderTexture keys
order-run RenderTexture logic
Graphics transform
player chunk strategy
Canvas2D fallback
stable-plan cache semantics
```

## Files changed

```text
src/presentation/render/optimization/shared-render-optimization-pixi-static-world-packet-consumer.js
src/infrastructure/logging/logging.js
```
