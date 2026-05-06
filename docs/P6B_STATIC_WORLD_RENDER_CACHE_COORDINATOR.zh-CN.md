# P6b Static World Render Cache Coordinator

本轮目标是继续削薄 `src/presentation/render/render.js`，将静态世界渲染缓存的重建调度从 presentation 层迁入 application 层。

## 修改内容

新增：

```text
src/application/render/static-world-render-cache-coordinator.js
```

该文件负责：

```text
scene snapshot / dirty chunk updates
  ↓
static world chunk cache sync
  ↓
visible chunk renderables collection
  ↓
staticBoxRenderCache payload update
  ↓
surfaceStats / profile / diagnostic log payload
```

原先 `render.js` 中的 `rebuildStaticBoxRenderCacheIfNeeded` 现在只保留薄包装：

```text
requireStaticWorldRenderCacheCoordinatorForRender()
createStaticWorldRenderCacheCoordinatorDepsForRender()
rebuildStaticBoxRenderCacheIfNeeded(...)
```

## 边界说明

`static-world-render-cache-coordinator.js` 属于 `application/render`。它可以编排 scene cache、chunk cache 和 renderable builder，但不能直接绘制。

禁止进入该文件的内容包括：

```text
ctx.drawImage / ctx.fill / ctx.stroke
document / DOM
new Image
localStorage / fetch / server API
camera transform 实际执行
Canvas renderer backend
```

这些仍属于 `presentation/render` 或 `infrastructure`。

## 加载顺序

`index.html` 中加载顺序为：

```text
src/application/render/static-world-renderable-builder.js
src/application/render/static-world-render-cache-coordinator.js
src/presentation/render/render.js
```

## 新增检查

新增：

```text
tests/static-world-render-cache-coordinator.test.js
scripts/check_render_cache_boundary.js
```

用于检查 coordinator 是否正确暴露、是否在 render.js 前加载、是否不直接依赖表现层 API，以及 `render.js` 是否没有重新持有 static cache rebuild 主体。
