# P11a-3：Render Preview / Selection Interaction Boundary

本轮目标是继续收口 render interaction 逻辑，将 `render.js` 中的 preview 更新与屏幕拾取流程迁到独立 owner：

```text
src/presentation/render/interaction/render-preview-interaction-controller.js
```

## 修改内容

迁出的职责包括：

```text
updatePreview 的主流程
pickBoxAtScreen
pickFaceAtScreen
delete 模式 hoverDeleteBox 更新
place / drag 模式 preview candidate 更新
preview signature logging
placement-preview rotation logging
```

`render.js` 仍保留原函数名，但只作为 thin wrapper：

```text
updatePreview
pickBoxAtScreen
pickFaceAtScreen
```

这样可以保持旧调用点不变，同时让 interaction owner 更明确。

## 边界规则

`render-preview-interaction-controller.js` 属于 presentation interaction 层，可以处理注入的 editor / mouse / surface faces / projection / placement candidate 依赖，但不得直接处理：

```text
Canvas 绘制
DOM mutation
localStorage / sessionStorage
fetch
scene / prefab 持久化
```

## 验证命令

```bash
node tests/render-preview-interaction-boundary.test.js
node scripts/check_render_preview_interaction_boundary.js
node scripts/check_all_guardrails.js
```
