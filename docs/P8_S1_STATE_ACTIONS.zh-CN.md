# Step 1：状态动作边界（P8-S1）

本轮只做一个主题：把“模式切换 / prefab 选择”收口到 `src/application/state/state-actions.js`。

## 本轮目标
- controller 不再直接决定如何改 `editor.mode` 或 `editor.prototypeIndex`
- 统一走 `App.state.actions`
- replay 报告中增加 `stateActions` 摘要，便于验证本轮是否真正生效

## 这一步不会做的事
- 不重写 placement / render
- 不改算法
- 不改数据协议

## 期望看到的验证证据
运行 `start_replay.bat` 后，`logs/self-check/` 中的 acceptance summary JSON 应包含：
- `stateActions.available = true`
- `stateActions.counters.modeChangeCalls > 0`
- `stateActions.counters.prefabSelectByIdCalls` 或 `prefabSelectByIndexCalls` 大于 0
- `stateActions.lastModeChange.route = "requestEditorModeChange"`（理想路径）
- `stateActions.lastPrefabSelection.route` 指向 `prefabRegistry.*`
