# P8b：Canvas2D Shadow Overlays 拆分记录

本轮目标是继续削薄 `src/presentation/render/render.js`，但不改变 renderable 数据协议、排序规则、scene/prefab 协议或 Canvas2D renderer 主流程。

## 迁出内容

从 `src/presentation/render/render.js` 中迁出：

```text
drawFaceShadowOverlays
drawFaceShadowOverlaysNoCamera
```

新增 owner：

```text
src/presentation/render/renderer/canvas2d-shadow-overlays.js
```

该文件负责 face shadow overlay 的 Canvas2D clipping、union shadow composite、高对比轮廓绘制与屏幕调试 payload 组装。

## 保留在 render.js 中的内容

`render.js` 只保留：

```text
getCanvas2dShadowOverlaysApiForRender
requireCanvas2dShadowOverlaysForRender
createCanvas2dShadowOverlayDepsForRender
drawFaceShadowOverlays
drawFaceShadowOverlaysNoCamera
```

其中 `drawFaceShadowOverlays` 和 `drawFaceShadowOverlaysNoCamera` 是 thin wrapper。

## 依赖注入

以下仍由 `render.js` 或其他 presentation/diagnostic 系统拥有，并通过 deps 注入：

```text
ensureShadowPolyUnionCanvas
fillShadowUnionWithDistanceFade
drawUnionShadowCanvasToTarget
clamp
shadowDebugLog
logScreenOverlayDebug
shadowProbeMatchReceiver
lightState
shadowStrokeCss
VIEW_W / VIEW_H
```

## 未修改内容

本轮未修改：

```text
Canvas2D renderer 主流程
renderable 数据结构
scene / prefab 协议
排序规则
static world cache
terrain / Habbo / player 行为逻辑
```

## 验证命令

```bash
node tests/canvas2d-shadow-overlays.test.js
node scripts/check_canvas_shadow_backend_boundary.js
node scripts/check_canvas_draw_backend_boundary.js
node scripts/check_project_hygiene.js
```
