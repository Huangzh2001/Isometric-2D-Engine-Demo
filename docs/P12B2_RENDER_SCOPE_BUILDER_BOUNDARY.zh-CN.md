# P12b-2 Render Scope Builder Boundary

本阶段将 `src/presentation/render/render.js` 中的主相机投影、viewport/world bounds、camera culling、visibility count 与 camera bounds debug 逻辑迁出到独立 owner：

- `src/presentation/render/projection/render-scope-builder.js`

## 职责边界

`render-scope-builder.js` 只负责：

- main camera render settings accessors；
- viewport screen bounds / pre-zoom screen bounds；
- viewport-to-world bounds projection；
- culling world bounds expansion；
- camera scope cache / visibility counts cache；
- renderable / light / box camera-scope filtering；
- camera bounds debug drawing；
- `window.__MAIN_CAMERA_CULLING_API__` 注册。

它不负责 terrain renderable construction、sprite/Habbo/player rendering、instance update-mode splitting、frame planning、placement preview、Canvas2D backend、UI、controller、asset 或 storage。

## 防回退规则

`render.js` 不应重新实现：

- `getMainCameraRenderScope`
- `computeMainEditorViewportWorldBounds`
- `filterRenderablesForMainCameraScope`
- `filterLightsForMainCameraScope`
- `filterBoxesForMainCameraScope`
- `drawMainCameraBoundsDebug`

如果后续 camera/projection/scope 逻辑继续增长，应按 projection math、visibility filtering、debug drawing 继续拆分，而不是继续塞回 `render.js` 或创建 `projection-utils.js` / `camera-helpers.js`。

## 验证命令

```bash
node tests/render-scope-builder-boundary.test.js
node scripts/check_render_scope_builder_boundary.js
node scripts/check_project_hygiene.js
node scripts/check_main_path_refs.js
```
