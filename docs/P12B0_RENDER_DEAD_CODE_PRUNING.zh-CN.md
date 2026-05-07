# P12b-0：Render Dead Code Pruning

本轮不是继续拆新 owner，而是在后续 Render.js de-hub 之前，先删除 `src/presentation/render/render.js` 中高置信度的历史残留函数，避免把无用代码继续迁移到新的模块中。

## 删除范围

本轮只删除 `render.js` 中全项目无真实调用痕迹的旧声明：

- `projectedBounds`
- `buildBoxFaces`
- `highestTopAtCell`
- `isMainEditorCameraCullingEnabledForRender`
- `getMainCameraVisibleBoxesForRender`
- `isActorInteractionSingleColumnTallGroup`
- `areAllActorInteractionPacketKeysHit`
- `accumulateRenderFunctionTiming`

其中 `highestTopAtCell` 在 `src/core/domain/scene-domain-core.js` 中仍有核心 owner；本轮只删除 `render.js` 内的陈旧副本。

## 不做的事情

- 不删除 namespace-bound compatibility wrapper。
- 不删除只被 guardrail 或 public API 间接约束的 wrapper。
- 不处理 `logic.js` 中旧 shadow 函数；该部分应作为后续独立审计。
- 不新增 `utils/helpers/common` 类混合文件。

## Guardrail

新增：

- `scripts/check_render_dead_code_pruning.js`
- `tests/render-dead-code-pruning.test.js`

这些检查用于防止上述陈旧声明重新回到 `render.js`。
