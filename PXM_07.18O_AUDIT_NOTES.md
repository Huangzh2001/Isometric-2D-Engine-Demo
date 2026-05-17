# PXM-07.18O audit notes

## Goal

Small-step PixiJS performance change after PXM-07.18N. This version does **not** move static-world ownership upstream to `framePlan` and does **not** replace the existing chunk RenderTexture pipeline. It only reduces the remaining CPU cost when the 07.18N stable item-plan cache is already valid.

## Evidence before the change

Recent logs showed:

- `staticPacketCount` remains around 2500--4300.
- `actualStaticDrawUnitCount` is already compressed to tens of Pixi draw units.
- `Canvas2D` static fallback is effectively zero when Pixi static-world adoption succeeds.
- PXM-07.18N cache-hit frames still spend several milliseconds in `staticPacketItemLoopMs`, because a hit still rebuilds the per-frame `chunkItems` array from cached base keys.

Therefore, the next safe target is not a new renderer and not a new packet cache. The target is the remaining O(N) materialization work on stable cache-hit frames.

## Existing implementations checked

The following existing mechanisms remain the source of truth:

- `staticPacketItemBaseCache`: projected geometry, draw data, chunk texture signature.
- `chunkEligibilitySplitCache`: split between external chunk-cache items and player-sensitive items.
- `orderRunPlanCache`: player-sensitive order-run RenderTexture plan.
- chunk RenderTexture cache: actual Pixi texture reuse.
- Canvas2D static bitmap run cache: still not visually adopted by this version, because run-level handoff is a larger architectural step.

## Why a small addition is still needed

No existing cache stores the already materialized `chunkItems` array for a validated stable item-plan key. PXM-07.18N intentionally cached only packet refs and `staticPacketItemBaseCache` keys. That was safer, but it still required walking every visible static packet on every cache hit.

PXM-07.18O adds a fast-hit payload **inside the existing stable item-plan cache entry**, rather than creating a parallel cache. The payload reuses references produced from `staticPacketItemBaseCache` and the already computed chunk eligibility split.

## Safety boundary

This version does not cache:

- sprite placement,
- Pixi transforms,
- container order mutations,
- RenderTexture objects beyond the existing chunk cache,
- framePlan generation results,
- Canvas2D bitmap surfaces.

The fast-hit payload is only used when the same 07.18O stable item-plan key matches. That key already includes static order identity, view rotation, cache-space/camera context, floor shared texture version, face-merge policy, and player-sensitive chunk eligibility policy.

## Expected log changes

On stable frames after the first miss/build:

- `staticMaterializedPlanCacheHit=true`
- `staticStableItemPlanFastHit=true`
- `staticStableItemPlanFastSplitHit=true`
- `staticStableItemPlanFastHitReason=fast-hit-stable-item-array-reused-existing-static-bases`
- `staticPacketItemLoopMs` should fall relative to PXM-07.18N cache-hit frames.
- `chunkEligibilitySplitMs` should be near zero when the fast split is reused.

If frame stutters remain, the next likely bottleneck is `chunkRenderTextureFrameMs`, especially `chunkRenderTextureGroupBuildMs` and `chunkRenderTextureSignatureBuildMs`. That would justify a later, separate run-level/chunk-group plan cache or upstream framePlan source change.
