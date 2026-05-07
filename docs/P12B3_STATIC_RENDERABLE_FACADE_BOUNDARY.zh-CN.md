# P12b-3：Static Renderable Facade / Glue Cleanup

本轮将 `render.js` 中的 static-world renderable builder 与 static-world render cache coordinator 的 lookup/dependency glue 迁出到：

`src/presentation/render/renderables/static-renderable-facade.js`

## 迁出职责

- `resolveRenderFunctionDependency`
- `requireStaticWorldRenderableBuilderForRender`
- `createStaticWorldRenderableBuilderDepsForRender`
- `buildStaticWorldChunkRenderables`
- `requireStaticWorldRenderCacheCoordinatorForRender`
- `createStaticWorldRenderCacheCoordinatorDepsForRender`
- `rebuildStaticBoxRenderCacheIfNeeded`

## 边界说明

该文件只负责 static renderable build/cache delegation，不负责 terrain renderable construction、sprite drawing、placement preview、frame plan、projection scope 或 Canvas2D backend。

`render.js` 不再持有这部分真实实现，只依赖该 owner 提供的全局兼容入口。
