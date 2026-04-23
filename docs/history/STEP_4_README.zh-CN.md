# Step 4 说明

本步围绕三个目标推进：

1. **降耦合**：新增 `src/infrastructure/adapters/placement-effects.js`，把 placement 中的拖拽模式切换、preview 清理、`updateModeButtons`、`updatePreview` 这一类 UI/编辑器副作用抽成单独适配层。
2. **提可维护性**：`src/application/controllers/app-controllers.js` 新增 placement 路由审计，记录 `state-actions` 新路径命中与 legacy/ui fallback。
3. **保迁移性**：UI 与 editor-return 对 placement 的刷新动作优先经由 `App.controllers.placement.syncPlacementUi(...)`，减少直接触碰 `updatePreview()`。

## 这一步跑完后重点看什么

请继续运行 `start_replay.bat`，然后把 `logs` 打包给我。

我会重点核对：

- `01-baseline` 里的 `placement-route-reset` / `placement-routes-baseline`
- `03-habbo-first-item-place` 里的 `placement-routes-after-habbo-place`
- `04-editor-x5-save-return-place` 里的 `placement-routes-after-editor-roundtrip`
- 新日志中是否出现 `startDragging:new-path-hit`、`cancelDrag:ui-sync-new-path-hit`、`placement.effects.syncPlacementUi` 等新路径证据

## 目标判定

这一步不要求一次性完全消灭 fallback。
目标是：

- replay 继续稳定通过
- placement 的 UI 副作用开始集中到 adapter
- 日志里能明确区分新路径命中与旧路径回退
