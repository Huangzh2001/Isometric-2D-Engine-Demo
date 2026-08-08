# PXM-07.18O5K - Singleton Graphics to Order-run RenderTexture

Base: PXM-07.18O5J.

This is a minimal targeted fix for the single visible player-sensitive Pixi.Graphics face shown by the O5H/O5J overlay as:

- GREEN player-sensitive Graphics expected n=1
- CYAN actual visible Graphics bounds n=1

## Change

`pixiStaticOrderRunRenderTextureMinPacketCount` now defaults to `1` instead of `2`.

That means singleton player-sensitive terrain runs are baked into order-run RenderTexture sprites instead of falling through to the persistent Pixi.Graphics path.

## Why this is minimal

This does not change:

- face merge policy
- framePlan generation
- chunk RenderTexture cache
- stable item-plan cache
- active chunk suppression
- Graphics transform code
- Canvas2D fallback

It only prevents the one/small leftover terrain Graphics from existing as a separate visible Graphics object in the main scene.

## Expected log behavior

The residual overlay should move from:

- GREEN/CYAN Graphics n=1

Toward:

- Graphics expected n=0 or no separated actual visible Graphics for that face
- orderRunRenderTextureCount may increase by a small amount
- orderRunRenderTextureMinPacketCount=1

