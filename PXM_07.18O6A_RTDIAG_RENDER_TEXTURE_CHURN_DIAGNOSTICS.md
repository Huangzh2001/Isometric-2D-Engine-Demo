# PXM-07.18O6A-RTDIAG: RenderTexture churn diagnostics only

## Purpose

This version does not change rendering behavior. It adds diagnostics to explain why chunk/order-run RenderTexture cache entries miss or upload before any further performance optimization is attempted.

## Based on

PXM-07.18O6A-EVAL, preserving:

- O5K singleton Graphics → order-run RenderTexture fix
- O6A chunk-level item-plan step 1
- O6A-EVAL performance assessment logs

## What changed

Only diagnostics were added in:

- `src/presentation/render/optimization/shared-render-optimization-pixi-static-world-packet-consumer.js`
- `src/infrastructure/logging/logging.js`

New log channel:

- `rendertexture-churn-diagnostics`

## What did not change

No changes to:

- framePlan generation
- face merge policy
- chunk RenderTexture cache keys
- order-run RenderTexture cache keys
- RenderTexture creation/reuse decision
- coordinates / transform mapping
- player chunk policy
- stable-plan cache semantics
- Canvas2D fallback

## New diagnostic fields

For chunk RT and order-run RT miss/upload frames, the logs report:

- `kind`: `chunk-render-texture` or `order-run-render-texture`
- `groupCount`, `hitCount`, `missCount`, `uploadCount`
- `reasonCounts`
- `samples`

Each sample includes:

- `key`
- `reason`
- `packetCount`, `commandCount`
- current/previous texture size
- current/previous cache space
- current/previous transform scale
- current/previous floor-build camera and zoom
- previous/current signature hashes
- first differing signature part
- whether bounds or packet count changed

## How to use

Run the same drag/zoom/performance test and export logs. Search for:

```text
rendertexture-churn-diagnostics
static-world-performance-assessment
forensics-static-world
```

## Decision rule

Do not continue with O6B until the churn diagnostics identify the dominant miss reason:

- `cache-space-changed` / `floor-build-camera-changed`: diagnose cache-space invalidation first.
- `signature-mismatch` with `boundsChanged=true`: inspect projected bounds / build-space stability.
- `dimension-mismatch`: inspect texture sizing/padding/bounds rounding.
- `cache-missing`: inspect cache eviction or new chunk visibility.
- `order-run-render-texture` churn: inspect order-run plan/cache separately from chunk RT.
