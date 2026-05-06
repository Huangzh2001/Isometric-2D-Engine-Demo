# P8 Canvas2D Draw Primitives 拆分记录

本轮目标：继续削薄 `src/presentation/render/render.js`，但不直接大拆 Canvas renderer 后端。先把低层 Canvas2D primitive 绘制工具迁入 renderer 子目录。

## 新增 owner

```text
src/presentation/render/renderer/canvas2d-draw-primitives.js
```

该文件负责：

```text
drawPolyOn
drawPolyWithOffsetOn
averagePointWithOffset
buildPath2DFromPoints
buildPath2DFromLoops
buildPath2DFromSegments
drawTextBadgeOn
drawMultilineBadgeOn
```

这些函数属于 presentation renderer backend，因为它们直接操作 CanvasRenderingContext2D 或 Path2D。

## render.js 保留内容

`render.js` 仍保留兼容函数名，但只作为 thin wrapper：

```text
drawPoly
drawPolyWithOffset
averagePointWithOffset
drawPolyOn
buildPath2DFromPoints
buildPath2DFromLoops
buildPath2DFromSegments
drawTextBadge
drawMultilineBadge
```

wrapper 只调用：

```text
requireCanvas2dDrawPrimitivesForRender()
```

## 边界

`canvas2d-draw-primitives.js` 可以使用：

```text
CanvasRenderingContext2D
Path2D
```

但不得访问：

```text
scene runtime globals
staticBoxRenderCache
localStorage
fetch / server APIs
document
Image allocation
```

它只负责“低层怎么画基本图元”，不负责“这一帧画什么”、排序、renderable assembly、scene/prefab 协议或应用流程。

## 验证

```bash
node tests/canvas2d-draw-primitives.test.js
node scripts/check_canvas_draw_backend_boundary.js
node scripts/check_project_hygiene.js
```
