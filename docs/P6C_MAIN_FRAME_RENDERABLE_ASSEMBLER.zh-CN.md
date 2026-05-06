# P6c Main Frame Renderable Assembler 拆分记录

## 目标

本轮目标是继续削薄 `src/presentation/render/render.js`，将主帧 renderable 组装流程迁入 `application/render`。

## 新增 owner

```text
src/application/render/main-frame-renderable-assembler.js
```

该文件负责：

```text
static renderables / dynamic renderables / player actor renderables
  ↓
actor-interaction replacement
  ↓
merge + final renderable order
  ↓
currentViewRotation / drawScreenPosition finalization
```

## render.js 中保留的内容

`render.js` 只保留薄包装：

```text
requireMainFrameRenderableAssemblerForRender()
buildRenderables()
buildMainFrameRenderables()
```

## 明确没有迁移的内容

本轮没有迁移：

```text
Canvas 绘制
ctx.drawImage / fill / stroke
camera transform 执行
renderer/canvas2d-renderer.js
scene / prefab 数据协议
server / storage 逻辑
```

## 边界说明

`main-frame-renderable-assembler.js` 当前仍包含少量过渡性 presentation hook，例如通过 draw callback 调用既有绘制函数。这是为了保持非模块化脚本加载模型下的行为稳定。后续 P8 可继续将真实 Canvas 绘制 backend 收束到 renderer adapter。

## 验证命令

```bash
node tests/main-frame-renderable-assembler.test.js
node scripts/check_frame_assembler_boundary.js
node tests/static-world-render-cache-coordinator.test.js
node scripts/check_render_cache_boundary.js
node tests/static-world-renderable-builder.test.js
node scripts/check_render_builder_boundary.js
node scripts/check_main_path_refs.js
node scripts/check_project_hygiene.js
```
