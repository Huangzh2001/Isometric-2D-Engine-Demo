# 第一步说明（P8-S1）

这一步只做一件事：

- 把 **模式切换 / prefab 选择** 收口到统一状态动作边界 `src/application/state/state-actions.js`
- 并把验证证据写入 `start_replay.bat` 生成的 acceptance summary JSON

## 本轮修改文件
- `index.html`
- `src/application/state/state-actions.js`（新增）
- `src/application/controllers/app-controllers.js`
- `src/infrastructure/self-check/scenario-runner.js`
- `src/presentation/shell/app.js`
- `docs/P8_S1_STATE_ACTIONS.zh-CN.md`（新增）

## 你跑 replay 后我重点看什么
请把 `logs` 文件夹打包给我。

我会重点看 `logs/self-check/` 下 acceptance summary / flow JSON 里的这些字段：

- `stateActions.available`
- `stateActions.counters.modeChangeCalls`
- `stateActions.counters.prefabSelectByIdCalls`
- `stateActions.counters.prefabSelectByIndexCalls`
- `stateActions.lastModeChange`
- `stateActions.lastPrefabSelection`

## 本轮目标
不是最终重构完成，而是确认：

1. controller 层是否已经开始通过统一状态动作边界改状态；
2. replay 自检里是否能留下足够证据；
3. 这一刀是否稳定，没有把 editor / replay 主流程搞坏。
