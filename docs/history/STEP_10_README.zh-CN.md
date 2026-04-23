# Step 10 / 严格护栏第 1 轮：收紧 scene/session 状态写入边界

本轮只处理一个主题：
- scene/session 核心状态写入边界

## 本轮改动
- `src/core/state/scene-session-state.js`
  - 新增 `replaceInstances`
  - 新增 `allocateInstanceId`
  - 新增 `allocateBoxIdRange`
  - `removeInstanceByIdOwned` 不再回调 placement 公开入口，而是 owner 自己完成写入
- `src/application/placement/placement.js`
  - `allocInstanceId` 优先走 `sceneSession.allocateInstanceId`
  - `expandInstanceToBoxes` 优先走 `sceneSession.allocateBoxIdRange`
  - `filterInstancesToGrid` 优先走 `sceneSession.replaceInstances`
  - `removeInstanceById` 优先走 `sceneGraph.removeInstanceById`
  - `defaultInstances/defaultBoxes` 改为局部纯构造，不再临时改全局 `nextInstanceSerial/instances/nextId`

## 本轮验收要看什么
- `scene-session-*` 摘要里是否出现：
  - `replaceInstancesCalls`
  - `allocateInstanceIdCalls`
  - `allocateBoxIdRangeCalls`
- `placement-route-audit` 里是否出现：
  - `allocInstanceId:owner-hit`
  - `expandInstanceToBoxes:owner-hit`
  - `filterInstancesToGrid:owner-hit`
  - `removeInstanceById:owner-hit`
- 若未命中 owner，则应看到明确的 `legacy-fallback` 事件
