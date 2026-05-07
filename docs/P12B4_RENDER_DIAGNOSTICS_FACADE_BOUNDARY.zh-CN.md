# P12b-4：Render Diagnostics / Debug Payload Facade Boundary

本阶段将 `src/presentation/render/render.js` 中剩余的渲染诊断、debug payload、build diagnostics gate 转发、terrain first-frame context 与 render-function timing bucket 逻辑迁移到：

```text
src/presentation/render/diagnostics/render-diagnostics-facade.js
```

## 职责边界

该 owner 只负责：

- render diagnostics API lookup / require；
- render build diagnostics gate delegation；
- render frame / camera / zoom / cache diagnostics forwarding；
- terrain first-frame detail gating 与 frame log context；
- render-function timing/debug breakdown bucket；
- `__MAIN_RENDER_DIAGNOSTICS__` 的轻量兼容出口。

该 owner 不负责：

- Canvas2D 绘制；
- terrain/sprite/preview/frame-plan 构造；
- UI DOM；
- controller 编排；
- asset/storage/file IO。

## 约束

`render.js` 不应重新定义以下诊断 facade 函数：

- `getRenderDiagnosticsApiForRender`
- `requireRenderDiagnosticsForRender`
- `emitRenderFrameSummary`
- `maybeLogRenderFrameSummary`
- `emitChunkRebuildBreakdown`
- `recordRenderFunctionTiming`
- `getTerrainFrameLogContextForRender`

相关边界由以下脚本保护：

```bash
node scripts/check_render_diagnostics_facade_boundary.js
node tests/render-diagnostics-facade-boundary.test.js
```
