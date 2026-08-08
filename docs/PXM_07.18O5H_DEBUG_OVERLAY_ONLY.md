# PXM-07.18O5H — debug overlay only from O5 baseline

## Purpose

This build intentionally returns to the PXM-07.18O5 baseline and adds only a visual/debug overlay for the player-chunk zoom/stale-face issue.

It does **not** include O5B/O5C/O5E/O5F/O5G rendering fixes.

## Hard constraints

No rendering behavior was changed:

- No framePlan generation changes.
- No chunk RenderTexture cache changes.
- No order-run RenderTexture cache changes.
- No persistent Graphics reuse/signature changes.
- No coordinate transform changes.
- No sprite-pool visibility changes.
- No stable-plan cache key changes.
- No Canvas2D fallback changes.

## Files changed

- `src/presentation/render/optimization/shared-render-optimization-pixi-static-world-packet-consumer.js`
- `src/infrastructure/logging/logging.js`

## Overlay legend

The overlay is enabled by default in this diagnostic build. It can be disabled with:

```js
localStorage.setItem('pixiPlayerChunkDebugOverlay', '0')
```

Legend:

- Red: expected active player chunk bounds from player-sensitive packets.
- Blue: ordinary chunk RenderTexture sprite bounds.
- Green: expected bounds of the current player-sensitive Graphics item list.
- Cyan: actual visible Pixi Graphics bounds from the Graphics pool.
- Yellow: order-run RenderTexture sprite bounds.

## Important log section

Search the exported log for:

```text
player-chunk-debug-overlay
```

Key fields:

- `activeChunkKey`
- `transformActive`
- `transformScale`
- `activeChunkExpectedBounds`
- `graphicsExpectedBounds`
- `actualGraphicsBounds`
- `visibleChunkSpritePoolCount`
- `activeChunkVisibleChunkSpritePoolCount`
- `visibleOrderRunSpritePoolCount`
- `spriteSamples`
- `graphicsSampleBounds`

## Interpretation

- If blue/yellow stays behind while red/green/cyan moves, the stale object is a sprite/RenderTexture layer.
- If cyan stays behind while green/red moves, the actual Graphics display object is stale.
- If red/green/cyan all stay together but differ from blue chunks during zoom, the mismatch is a coordinate-space/transform convention issue.
- If `activeChunkVisibleChunkSpritePoolCount > 0`, the active player chunk still has a visible chunk sprite and the issue is likely stale sprite-pool state.
