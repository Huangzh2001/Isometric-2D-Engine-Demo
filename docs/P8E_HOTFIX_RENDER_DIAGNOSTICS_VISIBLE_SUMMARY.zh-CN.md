# P8e Hotfix：render diagnostics 状态漏迁修复

## 问题

P8e 将 render frame summary 的节流状态从 `src/presentation/render/render.js` 迁移到：

```text
src/presentation/render/diagnostics/render-diagnostics.js
```

但 `src/application/render/main-frame-renderable-assembler.js` 仍然直接读取旧变量：

```text
__lastRenderFrameSummaryLogAt
```

浏览器运行时因此报错：

```text
ReferenceError: __lastRenderFrameSummaryLogAt is not defined
```

## 修复

新增 diagnostics API：

```text
shouldForceExactVisibleSummary(terrainFirstFrameWindow, now)
```

并在 `render.js` 中提供薄包装：

```text
shouldForceExactVisibleSummaryForRender(terrainFirstFrameWindow, now)
```

`main-frame-renderable-assembler.js` 不再读取已迁移的 diagnostics 状态变量，而是调用该 wrapper。

## 边界

本次只修复 P8e 漏迁，不改：

```text
Canvas 绘制
scene / prefab 协议
排序规则
frame assembler 主流程
render cache / static world cache
```

## 回归检查

已更新：

```text
tests/render-diagnostics.test.js
tests/main-frame-renderable-assembler.test.js
scripts/check_render_diagnostics_boundary.js
```

确保 application assembler 不再直接读取 `__lastRenderFrameSummaryLogAt`。
