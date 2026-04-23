# Step 9 说明

本步目标：

1. 收口 placement / scene 相关旧全局入口
2. 让 presentation 与 legacy 侧优先走 `legacy bridge`
3. 让 replay 日志直接反映：
   - owner API 命中
   - legacy bridge 命中
   - direct global 命中
   - fallback 次数

本步新增：

- `src/infrastructure/audit/runtime-route-audit.js`
- `src/infrastructure/legacy/placement-legacy-bridge.js`

本步关键改动：

- `src/presentation/shell/app.js` 改为优先走 placement legacy bridge
- `src/infrastructure/legacy/state.js` 改为优先走 placement legacy bridge
- `src/application/placement/placement.js` 暴露 `application.placementCore`
- `src/core/state/scene-session-state.js` 优先走 placement core owner API
- `src/infrastructure/self-check/scenario-runner.js` 新增 `runtime-routes-*` 摘要

本步重点验收：

- replay 仍然完整通过
- `runtime-routes-baseline`
- `runtime-routes-after-habbo-place`
- `runtime-routes-after-editor-roundtrip`
- 观察 `ownerApiHits / legacyBridgeHits / directGlobalHits / fallbackCount`
