# P8d Canvas2D Floor Layer Draw-Pass 拆分记录

本轮将 `src/presentation/render/render.js` 中的 floor layer / floor chunk Canvas 后端逻辑迁入：

```text
src/presentation/render/renderer/canvas2d-floor-layer-draw-pass.js
```

## 迁出的职责

```text
completeFloorLayerBreakdown
ensureFloorLayerCanvas
getActiveCameraInteractionTypeForFloorLayer
getCameraSettleReuseStateForFloorLayer
shouldDeferFloorLayerSettleCommit
shouldForceFloorLayerInteractionReuse
getFloorChunkSizeForLayer
ensureFloorChunkCacheState
getFloorChunkKeyForLayer
parseFloorChunkKeyForLayer
computeVisibleFloorChunkKeysForLayer
buildFloorLayerViewSignatureForLayer
buildFloorChunkEntryForLayer
drawFloorOutlineToLayer
rebuildFloorLayerIfNeeded
drawFloor
```

## 保留在 render.js 的职责

`render.js` 只保留 thin wrapper 和依赖注入：

```text
requireCanvas2dFloorLayerDrawPassForRender
createCanvas2dFloorLayerDrawPassDepsForRender
```

## 边界

- floor layer 离屏 canvas 构建、chunk canvas 绘制、chunk composite、floor outline、main canvas blit 属于 presentation/renderer；
- `floorLayerCanvas`、`floorLayerCtx`、`floorLayerCache` 等状态仍由 render runtime/legacy state 持有，通过 getter/setter 注入；
- 不迁移 scene/prefab 协议、application renderable assembly、static world cache coordinator、排序规则或 server/fetch 逻辑。

## 检查命令

```bash
node --check src/presentation/render/renderer/canvas2d-floor-layer-draw-pass.js
node --check src/presentation/render/render.js
node tests/canvas2d-floor-layer-draw-pass.test.js
node scripts/check_canvas_floor_layer_boundary.js
node scripts/check_project_hygiene.js
```
