# P11a-1：Render Logic Interaction Boundary

## 目标

本轮不是继续大规模拆 `render/logic.js`，而是先建立后续拆交互逻辑的落点：

```text
src/presentation/render/interaction/render-logic-interaction-boundary.js
```

它接管 `logic.js` 中对主编辑器 controller、runtime editor state、view-rotation core 和投影配置的边界访问。`logic.js` 仍然保留 `iso` / `screenToFloor` 等后续 P11a-2 计划处理的投影函数，但不再直接探测主 controller 的 view-rotation API。

## 修改内容

新增：

```text
src/presentation/render/interaction/render-logic-interaction-boundary.js
scripts/check_render_logic_interaction_boundary.js
tests/render-logic-interaction-boundary.test.js
docs/P11A1_RENDER_LOGIC_INTERACTION_BOUNDARY.zh-CN.md
```

更新：

```text
index.html
src/presentation/render/logic.js
AGENTS.md
docs/CANONICAL_OWNER_MAP.zh-CN.md
scripts/check_all_guardrails.js
scripts/check_project_hygiene.js
scripts/check_final_hygiene_freeze.js
```

## Owner 边界

| 职责 | Owner |
|---|---|
| render logic 对主 controller / runtime editor state 的读取 | `src/presentation/render/interaction/render-logic-interaction-boundary.js` |
| `logic.js` 中对该边界的调用 | thin wrapper |
| `iso` / `screenToFloor` 具体投影逻辑 | 暂留 `src/presentation/render/logic.js`，后续 P11a-2 再拆 |
| Canvas 绘制 | 不属于本 owner |
| localStorage / fetch / DOM mutation | 不属于本 owner |

## 迁移后的规则

`logic.js` 不应直接调用：

```text
controller.isMainEditorViewRotating('presentation.render.logic')
controller.getMainEditorVisualRotation('presentation.render.logic')
controller.getMainEditorViewRotation('presentation.render.logic')
```

而应通过：

```text
requireRenderLogicInteractionBoundaryForLogic()
```

调用 `render-logic-interaction-boundary.js` 暴露的 API。

## 验证命令

```bash
node tests/render-logic-interaction-boundary.test.js
node scripts/check_render_logic_interaction_boundary.js
node scripts/check_render_logic_boundary.js
node scripts/check_all_guardrails.js
```

## 后续

P11a-2 可继续处理：

```text
screen-to-world
iso / screenToFloor
hit-test helper
hover target detection 的纯 helper
```

但这部分本轮没有动，以降低风险。
