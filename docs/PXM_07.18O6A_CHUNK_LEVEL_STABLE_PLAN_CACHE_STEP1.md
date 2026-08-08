# PXM-07.18O6A — chunk-level stable item-plan cache, step 1

## Goal

This version starts the CPU-side performance work after O5K fixed the singleton leftover Graphics face. It keeps the O5K visual/rendering behavior and adds a conservative chunk-level item-plan cache used only on frame-level stable-plan cache misses.

## What changed

Modified file:

- `src/presentation/render/optimization/shared-render-optimization-pixi-static-world-packet-consumer.js`

The frame-level stable plan remains the primary fast path. When it misses, O6A groups current static packets by `chunkKey` and tries to reuse unchanged chunks from `staticChunkItemPlanCache`.

A chunk cache hit reuses existing `staticPacketItemBaseCache` payloads:

- projected geometry
- chunk texture signature
- chunk draw data

It refreshes frame-local order metadata from the current frame:

- packet reference
- runStartIndex
- packetIndex
- orderIndex

It does not cache or reuse:

- Pixi Sprite placement
- RenderTexture objects
- visible flags
- Graphics objects
- framePlan
- coordinate transform state

## What was intentionally not changed

- No change to face merge behavior.
- No change to O5K singleton Graphics-to-order-run RT fix.
- No change to chunk RenderTexture keys.
- No change to order-run RenderTexture logic.
- No change to Graphics transform or player chunk drawing rules.
- No change to Canvas2D fallback.

## Why this is the first step

O5K logs showed the GPU/Sprite side is mostly working, but CPU still scans 1399–2505 static packets per frame. O6A does not attempt a full run-level/framePlan refactor. It only reduces the cost of global stable-plan miss frames by allowing unchanged chunks to reuse existing lower-level packet bases.

## New diagnostics

Look for these fields in `forensics-static-world` and `begin-frame-phase-diagnostics`:

- `staticChunkItemPlanCacheEnabled`
- `staticChunkItemPlanCacheHitCount`
- `staticChunkItemPlanCacheMissCount`
- `staticChunkItemPlanCacheHitRate`
- `staticChunkItemPlanCacheHitPacketCount`
- `staticChunkItemPlanCacheMissPacketCount`
- `staticChunkItemPlanCacheBuiltPacketCount`
- `staticChunkItemPlanCacheLookupMs`
- `staticChunkItemPlanCacheMaterializeMs`
- `staticChunkItemPlanCacheSize`

## Expected signal

On frames where the global `staticStableItemPlanFastHit=false`, O6A should still show some chunk-level hits if most visible chunks are unchanged:

```text
staticChunkItemPlanCacheHitCount > 0
staticChunkItemPlanCacheHitPacketCount > 0
staticPacketItemLoopMs lower than previous miss frames
```

If `staticChunkItemPlanCacheHitRate` remains low, then visible chunks are actually changing or the chunk-level context key is still too sensitive. In that case, the next step should be diagnostics/key normalization, not a broad rendering rewrite.

## Safety switch

To disable only this new chunk-level cache:

```js
localStorage.setItem('pixiStaticChunkItemPlanCache', '0')
```

