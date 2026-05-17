# PXM-07.18O4 Audit Notes — stable-plan key normalization

## Scope

This is a small, targeted follow-up to PXM-07.18O3. It does not change framePlan generation, Pixi coordinates, chunk keys, RenderTexture ownership, Canvas2D fallback, sprite placement, or draw ordering rules.

Changed files:

- `src/presentation/render/optimization/shared-render-optimization-pixi-static-world-packet-consumer.js`
- `src/infrastructure/logging/logging.js`

## Evidence from O3 logs

O3 showed that most remaining stable-plan cache misses were not caused by Canvas2D fallback, RenderTexture cache churn, shared texture invalidation, face-merge changes, or camera changes.

The dominant pattern was:

- `staticStableItemPlanFastHit=false`
- `stablePlanKeyRunsHashChanged=true`
- `stablePlanKeyStaticSharedTexVerChanged=false`
- `stablePlanKeyFaceMergeChanged=false`
- `stablePlanKeyFloorBuildCameraChanged=false` in most miss frames
- `stablePlanKeyNearestCacheHit=true` in most miss frames
- many diffs were `hash` only, or `hash,top;cell`, with diagnostic text showing volatile `run` / `packetIndex` movement.

This indicates that the stable-plan key was too sensitive to frame-local run/order metadata.

## Existing implementations checked and reused

- `staticPacketItemBaseCache`: still the authoritative cache for projected geometry, draw data, and chunk texture signatures.
- `chunkEligibilitySplitCache`: still reused; O4 does not replace it.
- `orderRunPlanCache`: still reused for player-sensitive order-run texture planning.
- chunk RenderTexture cache: unchanged.
- O3 key-diff diagnostics: retained to verify whether `hash-only` miss storms disappear.

## Why new code was needed

There was no existing function that separates:

1. stable content identity used for cache lookup; and
2. volatile frame-local order metadata needed for zIndex / player interleaving.

O3 proved that mixing these two concerns into one key caused avoidable miss storms.

## What changed

O4 normalizes the stable item-plan content key by removing volatile frame-local fields from the hashed packet identity:

- `runStartIndex`
- `packetIndex`
- per-run grouping count / run boundary metadata

The content key still preserves stable static-content fields such as packet id, instance/prefab id, chunk, face, faceKey, cell, sort/depth, merge/fill/stroke/width, terrain boundary, overlay count, world fingerprint, stable demerge flags, view/camera cache-space fields, shared texture version, floor surface revision, face-merge mode, and chunk eligibility policy.

## Safety guard added

Because cached `chunkItems` carry `runStartIndex`, `packetIndex`, `orderIndex`, and packet references, O4 does not blindly reuse stale order metadata after a normalized-key hit.

On every cache hit, O4 rebuilds only the lightweight current order metadata from the current `runs`, then refreshes each cached item with:

- current packet reference
- current `runStartIndex`
- current `packetIndex`
- current `orderIndex`

This keeps z ordering and player interleaving aligned with the current frame while still reusing the existing static base cache and fast split payload.

## Expected log evidence

Compared with O3, O4 should show:

- fewer `stablePlanKeyDiffFields=hash` miss frames after scene warm-up
- higher `staticStableItemPlanFastHit` ratio
- more frequent `staticStableItemPlanFastHitReason=fast-hit-normalized-content-key-refreshed-current-order-metadata`
- lower miss-storm frequency in the previously problematic middle frames

Remaining misses should correspond to real changes such as packet count changes, camera/cache-space transitions, texture-version invalidation, or visible static content changes.
