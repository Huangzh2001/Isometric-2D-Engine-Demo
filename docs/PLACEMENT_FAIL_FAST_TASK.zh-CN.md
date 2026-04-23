# Placement fail-fast 清理 / ownership 校验

## 目标
确保所有关键 placement 导出都只能通过 `src/application/placement/placement.js` 进入。

## 允许的改动
- 给关键 placement 导出添加 owner 标记。
- 在启动阶段加入 ownership 校验。
- 如果任一关键 placement 函数缺失或被其他路径覆盖，直接抛出 `[LEGACY-PLACEMENT-PATH-CALLED]`。

## 禁止的改动
- 不修改 player、lighting、render 管线以及排序算法行为。
- 不修改 scene / prefab 数据结构。
- 不做无关重构。

## 校验的关键导出
- `allocInstanceId`
- `makeInstance`
- `createPlacedInstance`
- `recomputeNextInstanceSerial`
- `expandInstanceToBoxes`
- `rebuildBoxesFromInstances`
- `refreshPlacementOrdering`
- `findInstanceById`
- `findInstanceForBox`
- `removeInstanceById`
- `removePlacedInstance`
- `defaultInstances`
- `defaultBoxes`
- `legacyBoxesToInstances`
- `startDragging`
- `movePlacedInstance`
- `placeCurrentPrefab`
- `commitPreview`
- `commitPlacementPreview`
- `cancelDrag`

## 验收
- 主程序可正常打开。
- placement 相关操作仍然可用。
- 日志中不出现 `[LEGACY-PLACEMENT-PATH-CALLED]`。
- 一旦出现该标记，能直接看到是哪个导出失败。
