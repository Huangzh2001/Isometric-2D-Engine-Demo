# PXM-07.18O5H1 Debug Overlay Toggle

基线：PXM-07.18O5H debug-overlay-only。

本版本只增加测试面板开关，用于控制 Pixi 人物 chunk 调试网格覆盖层。

## 修改文件

- `index.html`
- `src/presentation/ui/pixi-backend-test-controls.js`

## 行为

新增测试页「调试开关」：

- `调试：显示 Pixi 人物 chunk 网格覆盖层`

它只写入：

- `localStorage.pixiPlayerChunkDebugOverlay = "1" | "0"`
- `window.__PIXI_PLAYER_CHUNK_DEBUG_OVERLAY__ = true | false`

## 明确未修改

- Pixi static-world 渲染逻辑
- framePlan
- 坐标变换
- RenderTexture / order-run cache
- persistent Graphics reuse
- stable-plan cache

该版本只提供可视化调试开关，不参与任何渲染决策。
