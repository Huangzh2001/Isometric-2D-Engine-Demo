# VALIDATION v4.17.6

## 重点检查

1. **tree 等 single4-diagonal 素材**
   - `keyframemorph` 下不应再出现 `maxObservedH = 0`。
   - 新日志里应出现 `solver: voxel-shadow-intersection`。

2. **pyramid 等四方向独立素材**
   - 中间角度仍应存在阴影；
   - 四个端点仍严格回到精确关键帧。

3. **性能**
   - 这版把反推改为体素一致性测试，CPU 开销会更高；
   - 重点观察拖动是否仍可接受。
