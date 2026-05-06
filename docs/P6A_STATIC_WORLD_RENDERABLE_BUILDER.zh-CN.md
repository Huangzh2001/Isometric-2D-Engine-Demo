# P6a Static World Renderable Builder

## 目标

本轮将 `buildStaticWorldChunkRenderables` 从：

```text
src/presentation/render/render.js
```

迁移到：

```text
src/application/render/static-world-renderable-builder.js
```

这一步的目标不是改变渲染效果，而是把“静态世界 chunk 转换为 renderable packets”的流程从 presentation 层拆出。

## 新 owner

```text
src/application/render/static-world-renderable-builder.js
```

该文件负责：

```text
chunk / boxMap / visible surface cells
  ↓
face descriptors
  ↓
merged descriptors
  ↓
static-world-face-packet[]
  ↓
stats / diagnostic payload
```

它不负责 Canvas 绘制，也不负责图片、DOM、存储或网络。

## render.js 当前职责

`render.js` 现在保留 thin wrapper：

```text
requireStaticWorldRenderableBuilderForRender
createStaticWorldRenderableBuilderDepsForRender
buildStaticWorldChunkRenderables
```

其中 `createStaticWorldRenderableBuilderDepsForRender` 显式提供颜色、阴影、材质、排序、日志等 hooks。这样可以避免 application 文件直接访问 presentation 层细节，同时保持现有非模块化 `<script>` 加载模型下的行为稳定。

## 禁止事项

`src/application/render/static-world-renderable-builder.js` 中禁止出现：

```text
ctx.*
canvas
document.*
new Image
localStorage.*
fetch(...)
```

Canvas 实际绘制、camera transform、frame pipeline、pattern 绘制和 image cache 仍属于 `presentation/render`。

## 新增检查

新增：

```text
tests/static-world-renderable-builder.test.js
scripts/check_render_builder_boundary.js
```

验证内容包括：

```text
1. builder API 是否暴露；
2. index.html 是否在 render.js 前加载 builder；
3. render.js 是否只保留 thin wrapper；
4. builder 是否不访问 Canvas / DOM / storage；
5. builder 在注入依赖后能从最小 chunk 生成 static-world-face-packet。
```

## 验证命令

```bash
node --check src/application/render/static-world-renderable-builder.js
node --check src/presentation/render/render.js
node --check scripts/check_render_builder_boundary.js
node tests/static-world-renderable-builder.test.js
node scripts/check_render_builder_boundary.js
node scripts/check_render_extracted_symbols.js
node scripts/check_main_path_refs.js
node scripts/check_project_hygiene.js
```
