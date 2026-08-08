# Prefab 局部坐标与行为点击修复 v4

本次修复统一了素材运行时的空间基准：

- 编辑器工作区中的 voxel 绝对平移不会再被当成素材世界坐标；
- 运行时建立 `prefab-local-frame-v1`，保留 voxel、anchor、sprite registration 之间的相对关系；
- voxel 旋转围绕 Prefab 局部坐标系执行，不再默认以工作区左上角为原点；
- anchor 允许为负值，不再通过 `Math.max(0, ...)` 截断；
- sprite 使用与 voxel 相同的旋转 anchor；
- Behavior 点击优先命中实际渲染 sprite；Pixi 未接管的方向使用主 sprite renderer 的屏幕范围；最后才使用 voxel 命中作为无 sprite 素材的 fallback。

回归测试覆盖：非零编辑器偏移、anchor 位于 footprint 外、四方向 voxel 旋转、Habbo facing、Placement、Behavior 点击以及主 bundle 语法。
