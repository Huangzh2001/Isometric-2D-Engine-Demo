# Step 3 说明

本次修复目标只有一个：恢复 `start_replay.bat` 的主流程，同时保留 `state-actions` 的接入与日志观测。

## 本次修复

1. 补上 `App.controllers.dispatch` 的根级命名空间绑定。
2. `scenario-runner` 不再只依赖根级 `controllers.dispatch`；现在接受：
   - `App.controllers.dispatch`
   - `App.controllers.placement.dispatch`
   任一可用即可继续。
3. baseline 报告新增 `placement-dispatch-ready`，用于确认 replay 开始时到底走哪条 dispatch 路径。

## 这一步要验证什么

跑 `start_replay.bat` 后，重点检查：

- replay 是否不再在 `placement-controller-and-state-actions` 这里超时
- `logs/self-check/acceptance-summary-*.json` 是否出现 `rawResultCount > 0`
- `01-baseline` 中是否出现 `placement-dispatch-ready`
- `stateActions.counters` 是否开始增长
