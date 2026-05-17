# PXM-07.18O3 Audit Notes — stable-plan cache key diff diagnostics

## Purpose

This version is diagnostics-only. It does not change rendering behavior, chunk keys, RenderTexture generation, sprite placement, `framePlan`, depth sorting, or Canvas2D fallback.

The previous O2 log showed that:

- Pixi performance log mode is now enabled by default.
- High-volume logs are suppressed successfully.
- `staticStableItemPlanFastHit=true` frames are substantially faster.
- However, many frames still have `staticStableItemPlanFastHit=false` even when `staticPacketCount` and `chunkRenderTextureHitRate` look stable.

The next uncertainty is which part of the stable-plan cache key is changing and causing miss storms.

## Existing implementation checked first

The following existing mechanisms were not replaced:

- `staticPacketItemBaseCache`
- `chunkEligibilitySplitCache`
- `orderRunPlanCache`
- chunk RenderTexture cache
- Pixi persistent Graphics/Sprite pools
- Canvas2D static bitmap run cache
- `framePlan.order`

No new render cache is introduced in O3.

## Added diagnostics

O3 adds stable-plan cache key diff fields to `begin-frame-phase-diagnostics` and `forensics-static-world`:

- `stablePlanKeyDiffReason`
- `stablePlanKeyMissComparedTo`
- `stablePlanKeyDiffFieldCount`
- `stablePlanKeyDiffFields`
- `stablePlanKeyDiffTop`
- `stablePlanKeyChangedFromPrevious`
- `stablePlanKeyNearestCacheHit`
- `stablePlanKeyNearestCacheDiffFieldCount`
- `stablePlanKeyNearestCacheDiffTop`
- `stablePlanKeyCurrentHash`
- `stablePlanKeyPreviousHash`
- `stablePlanKeyNearestCacheHash`
- `stablePlanKeyRunsHashChanged`
- `stablePlanKeyStaticSharedTexVerChanged`
- `stablePlanKeyFloorBuildCameraChanged`
- `stablePlanKeyFloorSurfaceRevisionChanged`
- `stablePlanKeyFaceMergeChanged`
- `stablePlanKeyCurrentCameraChanged`

## How to interpret the next log

If miss frames show:

- `stablePlanKeyRunsHashChanged=true`: static packet order/identity is changing. The next fix should move the stable order signature upstream or remove volatile packet fields from the identity if safe.
- `stablePlanKeyFloorBuildCameraChanged=true`: camera/floor-build-space fields are causing miss. The next fix should separate camera transform from stable item plan identity.
- `stablePlanKeyStaticSharedTexVerChanged=true`: shared floor texture version is invalidating the plan. The next fix should check whether this texture version actually affects static item materialization.
- `stablePlanKeyFloorSurfaceRevisionChanged=true`: floor revision churn is invalidating the plan. The next fix should identify why the revision changes during visually stable frames.
- `stablePlanKeyFaceMergeChanged=true`: face-merge/pending-merge state is unstable.
- `stablePlanKeyCurrentCameraChanged=true`: current camera is in the key because the path is not using floor-build reuse space.

If `stablePlanKeyNearestCacheHit=true` and `stablePlanKeyNearestCacheDiffFieldCount` is small, the miss storm is likely caused by one or two volatile key fields rather than true static-scene changes.

## Safety boundary

This version only parses and compares existing stable-plan cache keys. It does not reuse any new cached render object and does not change cache hit/miss decisions.
