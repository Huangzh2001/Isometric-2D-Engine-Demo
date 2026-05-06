# P9b：State / Legacy Bridge 收口

本轮目标不是继续削薄 `render.js`，而是处理剩余结构债中的 state / legacy 边界。

## 背景

`src/infrastructure/legacy/state.js` 长期承担了多类职责：

```text
1. 旧全局状态兼容；
2. App namespace 读取；
3. legacy placement bridge dispatch；
4. 启动阶段 ownership / compat mapping 报告；
5. 仍未迁出的历史行为。
```

这会导致后续 AI 容易继续把新状态和新兼容逻辑塞进 `legacy/state.js`。

## 本轮调整

新增：

```text
src/infrastructure/legacy/state-bridge.js
```

它现在负责：

```text
getStateNamespacePath
getStateApis
getPlacementLegacyBridgeState
callLegacyPlacement
reportLegacyStateBootOwnership
summarizeBoundary
```

`legacy/state.js` 只保留兼容 wrapper 和剩余历史行为，不再直接持有启动 ownership / compat mapping 报告表。

## 边界

```text
core/state
  长期状态容器 owner。

application/state
  状态写入流程和跨状态动作 owner。

infrastructure/legacy/state-bridge.js
  legacy state 与 namespace / placement bridge 的兼容桥 owner。

infrastructure/legacy/state.js
  仅剩历史兼容行为，不允许新增状态 owner。
```

## 检查

新增：

```text
tests/state-legacy-boundary.test.js
scripts/check_state_legacy_boundary.js
```

检查点包括：

```text
1. state-bridge.js 必须在 legacy/state.js 前加载；
2. state-bridge.js 必须暴露 __LEGACY_STATE_BRIDGE__；
3. legacy/state.js 必须通过 bridge 读取 namespace 和 placement bridge；
4. legacy/state.js 不得继续持有启动 compat mapping 表；
5. state-bridge.js 不得访问 Canvas、document、localStorage、fetch 或 Image。
```
