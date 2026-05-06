# P5 Terrain Render Core 拆分记录

## 目标

P5 的目标是继续削薄 `src/presentation/render/render.js`，但不移动 Canvas 绘制和调度逻辑。本轮只迁出与 terrain face / merge / material sort / boundary geometry 有关的纯规则。

## 新增 owner

```text
src/core/domain/terrain-render-core.js
```

该文件负责：

```text
getTerrainMaterialMergeKeyForRenderCell
getTerrainFaceMergeSignature
getTerrainSortBandKeyForRenderFace
getTerrainSideEdgeVisibilitySignature
occupancyReaderHasSolid
getTerrainSideTangentNeighbor
getTerrainSideStepBreakSignature
worldPointFromMergeUV
buildTerrainPolygonLoopSignature
buildTerrainTopBoundarySegmentsWorldFromDescriptor
buildMergedVoxelFaceWorldGeometry
buildMergedVoxelFaceWorldPolygon
```

这些函数只处理数据、坐标、签名和几何结构，不依赖 DOM、Canvas、Image、localStorage 或本地服务。

## render.js 保留内容

`src/presentation/render/render.js` 现在只保留兼容 wrapper：

```text
requireTerrainRenderCoreForRender().<function>(...)
```

Canvas pattern、fill/stroke、ctx clipping、debug overlay、render frame pipeline、image cache 等仍属于 `presentation/render`。

## 加载顺序

`index.html` 中必须保证：

```text
src/core/domain/terrain-face-merge-core.js
src/core/domain/terrain-render-core.js
src/presentation/render/render.js
```

其中 `terrain-render-core.js` 必须在 `render.js` 前加载。

## 新增检查

新增：

```text
scripts/check_render_extracted_symbols.js
tests/terrain-render-core.test.js
```

运行：

```bash
node tests/terrain-render-core.test.js
node scripts/check_render_extracted_symbols.js
node scripts/check_main_path_refs.js
node scripts/check_project_hygiene.js
```
