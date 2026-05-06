# P9a：Render Transitional Warning Cleanup

本轮目标不是继续大拆 `render.js`，而是清理前几轮拆分后遗留的两个 transitional warning，避免 application 层继续直接访问 presentation 诊断状态或直接执行排序实现。

## 修改范围

### 1. main-frame assembler 不再直接读取 localStorage

`src/application/render/main-frame-renderable-assembler.js` 原来在 actor sort 诊断入口中直接读取：

```text
localStorage.getItem('actorSortDiag')
localStorage.getItem('terrainPlayerDiag')
```

这违反 application 层边界。现在改为调用 presentation/render 提供的薄包装：

```text
noteActorInteractionRenderEntryForRender(...)
```

localStorage 读取仍保留在 `src/presentation/render/render.js` 的诊断 wrapper 内，后续如果继续整理 actor diagnostics，可再整体迁入 `src/presentation/render/diagnostics/render-diagnostics.js`。

### 2. main-frame assembler 不再直接使用 comparator sort

`main-frame-renderable-assembler.js` 原来直接执行：

```text
dynamicRenderables.sort(compareRenderablesByDomain)
```

现在改为调用：

```text
sortRenderablesByOrderForRender(dynamicRenderables)
```

该 wrapper 委托给：

```text
src/core/domain/render-order-core.js
```

这样 dynamic renderable sorting 不再由 application assembler 直接持有排序实现。

## 更新的边界检查

以下检查从 warning 升级为硬性约束：

```text
scripts/check_frame_assembler_boundary.js
scripts/check_render_order_boundary.js
```

现在会禁止：

```text
main-frame-renderable-assembler.js 直接读取 localStorage
main-frame-renderable-assembler.js 直接访问 __actorInteractionOrderDiagState
main-frame-renderable-assembler.js 直接调用 dynamicRenderables.sort(compareRenderablesByDomain)
```

## 验证命令

```bash
node tests/main-frame-renderable-assembler.test.js
node tests/render-order-core.test.js
node scripts/check_frame_assembler_boundary.js
node scripts/check_render_order_boundary.js
node scripts/check_project_hygiene.js
```
