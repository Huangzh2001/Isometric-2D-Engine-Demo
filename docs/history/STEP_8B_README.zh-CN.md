# Step 8B：四层骨架后的启动恢复接线修复

本次修复重点：

1. 修复 `scene-storage` 在启动恢复链路中直接读取旧全局 `instances` 导致的 `ReferenceError`
2. 让 `scene-session` owner 在运行时主动提供 `window.instances / window.boxes / window.nextId / window.nextInstanceSerial` 兼容桥
3. 让 `scene-storage` 的 workflow/summary 优先从 `sceneSession` owner 取 scene/session 摘要

## 跑完 replay 后重点看

- `scene-session-reset`
- `scene-session-baseline`
- `scene-session-after-habbo-place`
- `scene-session-after-editor-roundtrip`
- `acceptance summary` 里的 `sceneSession`

## 这次最想验证的现象

1. 启动阶段不再出现 `instances is not defined`
2. `sceneSession.available` 不再是 `false`
3. `scene-storage` 的 summary/workflow 能看到 `sceneSession`
