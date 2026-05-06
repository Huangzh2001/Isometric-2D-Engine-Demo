# P8c：Canvas2D Static World Face Draw Pass 拆分

本轮目标是继续削薄 `src/presentation/render/render.js`，把静态世界 face / voxel packet 的 Canvas 绘制后端迁入专门的 renderer 文件，而不是继续让 `render.js` 同时承担投影缓存、路径构造、材质 overlay、shadow overlay 和实际绘制。

## 新 owner

```text
src/presentation/render/renderer/canvas2d-static-world-face-draw-pass.js
```

## 迁出的职责

```text
buildStaticWorldPacketProjectionCacheKey
getStaticWorldPacketProjectedGeometry
drawTerrainTopBoundarySegmentsForPacket
drawCachedVoxelRenderable
drawCachedVoxelFaceRenderable
drawStaticWorldFacePacket
```

这些函数属于 presentation renderer 后端，因为它们处理的是 render packet 到 Canvas 绘制的转换，涉及 `ctx.fill`、`ctx.stroke`、`ctx.translate`、Path2D 相关 helper、terrain pattern overlay 和 shadow overlay 绘制。

## 保留在 render.js 的内容

`render.js` 只保留：

```text
getCanvas2dStaticWorldFaceDrawPassApiForRender
requireCanvas2dStaticWorldFaceDrawPassForRender
createCanvas2dStaticWorldFaceDrawPassDepsForRender
上述函数的 thin wrapper
```

运行时依赖通过依赖注入传入 draw pass，包括：

```text
ctx
camera
settings
screenPointsFromWorldFaceNoCamera
worldShadowOverlaysToNoCamera
Path2D helper
terrain material pattern overlay
shadow overlay draw helper
terrain boundary style helper
view rotation helper
```

## 未修改范围

本轮没有修改：

```text
scene / prefab 数据协议
core/domain 规则
application/render assembler / cache coordinator
render order / sorting
Canvas2DRenderer frame pipeline
player / floor editor / server
```

## 检查命令

```bash
node tests/canvas2d-static-world-face-draw-pass.test.js
node scripts/check_canvas_static_world_face_draw_pass_boundary.js
node scripts/check_project_hygiene.js
```
