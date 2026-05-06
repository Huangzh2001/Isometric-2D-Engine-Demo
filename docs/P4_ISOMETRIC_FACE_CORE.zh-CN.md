# P4：Isometric Face Core 拆分说明

本轮目标是继续削薄 `src/presentation/render/render.js`，将等距渲染中的 face / polygon / normal / merge-coordinate 等纯规则迁入 `core/domain`。

## 新增 owner

```text
src/core/domain/isometric-face-core.js
```

该文件负责：

```text
1. semantic face 到 screen face 的映射；
2. top / east / south / west / north 的世界坐标面片生成；
3. face normal 计算；
4. static world face merge 坐标计算；
5. face neighbor delta；
6. 基础 face fill 选择规则。
```

这些逻辑只依赖数字和普通对象，不依赖 DOM、Canvas、Image、localStorage 或 server API，因此属于 `core/domain`。

## render.js 的变化

`src/presentation/render/render.js` 现在只保留薄包装：

```text
getScreenFaceForSemanticFace
getBaseFaceFillRgbForSemanticFace
buildVoxelFaceWorldPolygon
getStaticWorldFaceMergeCoords
getSemanticFaceNormal
getSemanticFaceWorldPolygon
getSemanticFaceNeighborDeltaForRender
getVisibleSemanticMappingForRender
```

这些包装函数只负责调用 `requireIsometricFaceCoreForRender()`，不再重新实现 face 规则。

## 加载顺序

`index.html` 中新增：

```html
<script src="src/core/domain/isometric-face-core.js"></script>
```

加载顺序必须满足：

```text
item-facing-core.js
  ↓
isometric-face-core.js
  ↓
render.js
```

## 检查与测试

新增：

```text
tests/isometric-face-core.test.js
```

更新：

```text
scripts/check_main_path_refs.js
scripts/check_project_hygiene.js
```

验证命令：

```bash
node tests/isometric-face-core.test.js
node scripts/check_main_path_refs.js
node scripts/check_project_hygiene.js
```

## 本轮没有做的事

未修改 Canvas 绘制、图片合成、Habbo composite、scene/prefab 协议、player movement、floor editor 或 server 逻辑。
