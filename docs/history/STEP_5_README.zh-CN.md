# Step 5 说明

本步围绕三个目标继续推进，而不是只补 Step 4 的启动错误。

## 本步改动

1. 新增 `src/infrastructure/audit/placement-route-audit.js`
   - 统一记录 placement controller 与 placement core 的路径命中情况
   - 区分：`state-actions.*`、`placement.effects.*`、`legacy.*`、`ui-fallback.*`
   - replay 报告中的 placement route 摘要不再依赖 `scenario-runner` 的局部函数名

2. `src/application/controllers/app-controllers.js`
   - 修复 `summarizePlacementRoutes` / `resetPlacementRoutes` 未定义问题
   - 增加 `getPlacementEffects()` / `getPlacementRouteAudit()`
   - 增加 `applyPlacementIntent()`，把 placement 状态意图与 UI 同步组合为 application 层动作
   - `processEditorReturn()` 现在通过 `applyPlacementIntent()` 恢复 prefab + mode + preview

3. `src/application/placement/placement.js`
   - 核心 placement 事件也写入统一的 `placement.routeAudit`
   - 从而 replay 可以同时看到 controller 层与 placement 核心层的“新路径命中 / 旧路径回退”证据

4. `src/infrastructure/self-check/scenario-runner.js`
   - placement route 摘要优先读取 `App.placement.routeAudit`
   - controller 摘要仅作为后备

## 这一步对应的三个目标

- 降耦合：placement 路由审计从 controller 局部变量升级为独立 service；placement 状态意图通过 `applyPlacementIntent()` 聚合，UI 同步继续由 `placement.effects` 处理
- 提可维护性：replay 能看到统一的 placement route 画像，而不是零散日志
- 保迁移性：placement 主流程更像 application/controller + adapter 组合，而不是 controller 直接硬碰 UI 细节
