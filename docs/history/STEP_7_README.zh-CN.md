# Step 7：scene/session owner 前移

本轮目标：把 scene/session owner 从 `src/infrastructure/legacy/state.js` 前移到独立模块，并让 replay/self-check 能直接看到 owner 写入证据。

## 本轮改动

- 新增 `src/core/state/scene-session-state.js`
- `state.sceneGraph` / `state.sceneSession` 统一由该模块绑定
- `state.js` 不再持有 `instances / boxes / nextId / nextInstanceSerial` 的 owner 实现
- replay 报告新增：
  - `scene-session-reset`
  - `scene-session-baseline`
  - `scene-session-after-habbo-place`
  - `scene-session-after-editor-roundtrip`
  - acceptance summary 下的 `sceneSession`

## 重点关注日志字段

- `sceneSession.available`
- `sceneSession.session.instances`
- `sceneSession.session.boxes`
- `sceneSession.writes.counters.*`
- `sceneSession.writes.recentWrites`

## 期望

这一步不是把所有全局状态都清掉，而是先把最核心的 scene/session owner 从 `state.js` 里真正抽出去，并让自检能判断主路径是否经过 owner 写入。
