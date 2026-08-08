# PXM-07.18O5 Audit Notes

## Goal

O4 showed that exact-order stable item-plan fast-hit is very fast when it hits, but `hash-only` miss storms remain. O3/O4 logs indicate that static content, texture version, face-merge mode, and camera-space are usually unchanged during these miss storms. The remaining likely source is order churn inside `runsHash`.

## Prior implementation checked first

Existing mechanisms reviewed before changing code:

- `staticPacketItemBaseCache`: reused as the authoritative cache for projected geometry, draw data, and chunk texture signatures.
- exact `staticMaterializedPlanCache`: retained for O(1) fast-hit when frame-local order is unchanged.
- `chunkEligibilitySplitCache`: retained; content-set fallback does not reuse an old split because current order can change.
- `orderRunPlanCache`: retained and not replaced.
- chunk RenderTexture cache: unchanged.
- `framePlan.order` and `collectStaticRuns`: unchanged.

## Why a new small cache is necessary

O4 already removed explicit `runStartIndex` / `packetIndex` from the exact stable-plan content identity. However, exact `runsHash` is still sequence-sensitive. If the same static packet set appears in a different frame-local order, exact fast-hit correctly misses. Reusing the old fast item array in this case would be unsafe because projected/drawData entries could be paired with the wrong current packet/order.

The missing mechanism was therefore not another render cache, but a safe fallback for same-content/different-order frames:

- exact ordered key hit: reuse cached item array and split, then refresh current order metadata.
- exact ordered key miss but content-set key hit: rebuild current item array from existing `staticPacketItemBaseCache` entries using current order metadata.
- content-set fallback does **not** reuse old item arrays, old split arrays, sprite placement, transforms, RenderTextures, or frame-local order metadata.

## Safety boundary

O5 adds `staticMaterializedContentSetCache`, keyed by an order-insensitive content-set signature plus the same non-order safety fields used by exact plan keys:

- packet count
- content-set hash
- view / visualView
- static shared texture version
- cache space
- floor-build camera / zoom / scale
- floor surface revision
- face merge / pending face merge
- chunk eligibility policy
- current camera when not in floor-build cache space

On a content-set hit, the code builds current order metadata from the current `runs`, matches current packet content identities to previously cached base-cache keys, retrieves current bases from `staticPacketItemBaseCache`, and recomputes `chunkEligibilityItemHash` using current order. This avoids stale z-index or player interleaving metadata.

## Expected log evidence

O5 should add these fields to `forensics-static-world` and phase diagnostics:

- `staticMaterializedPlanExactCacheHit`
- `staticStableItemPlanContentSetHit`
- `staticStableItemPlanContentSetReason`
- `staticStableItemPlanContentSetKeyHash`
- `staticMaterializedContentSetCacheSize`
- `stablePlanKeyCurrentContentHash`
- `stablePlanKeyPreviousContentHash`
- `stablePlanKeyContentHashChanged`

Expected behavior:

- exact fast-hit frames should still show `staticStableItemPlanFastHit=true`.
- hash-only miss storm frames should become `staticStableItemPlanContentSetHit=true` when the content set is unchanged but order changed.
- `staticPacketItemLoopMs` on those formerly miss frames should drop compared with O4 full rebuild frames.

## Files changed

- `src/presentation/render/optimization/shared-render-optimization-pixi-static-world-packet-consumer.js`
- `src/infrastructure/logging/logging.js`

## Validation

`node --check` passed for all JavaScript files under `src`.
