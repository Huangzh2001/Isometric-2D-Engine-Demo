# P4-D：Placement + Render Ordering Domain Authority

本轮只提取第一批纯逻辑种子，不改渲染，不改 DOM：

- `deriveBoxesFromInstances(instances, expandInstanceToBoxes)`
- `buildOccupancyIndex(boxes)`
- `canPlaceBoxes(candidateBoxes, existingBoxes, ignoreInstanceId)`
- `deriveSceneGraph(instances, expandInstanceToBoxes)`

当前已接入：

- `src/application/placement/placement.js:rebuildBoxesFromInstances`

这表示项目已经开始把场景导出 / 占用判断相关逻辑往纯函数方向移动。
