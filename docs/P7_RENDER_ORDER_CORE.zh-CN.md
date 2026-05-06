# P7 Render Order Core 拆分记录

本轮目标：继续削薄 `src/presentation/render/render.js`，把纯排序规则迁到 `core/domain`。

## 新增 owner

```text
src/core/domain/render-order-core.js
```

该文件负责：

```text
compareRenderableOrder
sortRenderablesByOrder
mergeSortedRenderables
insertRenderableIntoSortedOrder
getRenderableStaticOrderSignature
```

## render.js 保留内容

`render.js` 仍保留兼容函数名，但只作为 thin wrapper：

```text
compareRenderablesByDomain
mergeSortedRenderables
insertSingleDynamicRenderableIntoSortedOrder
getPlayerMoveFastPathStaticOrderSignature
```

其中 `compareRenderablesByDomain` 仍优先兼容 `scene-domain-core.compareRenderableOrder`，fallback 进入 `render-order-core.compareRenderableOrder`。

## 边界

`render-order-core.js` 不访问：

```text
ctx / canvas / document / Image / localStorage / scene runtime / server API / storage API
```

它只处理普通 renderable descriptor 数据。

## 验证

```bash
node tests/render-order-core.test.js
node scripts/check_render_order_boundary.js
node scripts/check_project_hygiene.js
```
