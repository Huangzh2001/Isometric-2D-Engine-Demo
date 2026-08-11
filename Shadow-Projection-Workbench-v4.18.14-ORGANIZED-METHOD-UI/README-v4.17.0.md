# Shadow Projection Workbench v4.17.0

## 本版只改一件事：静止四方向精确关键帧的数值表示

**数学阴影定义不变。** 仍然使用原来的源视图 `vhProjectPoint()` / `exactKeyframeCameraRay()` 对应的正交关键帧投影。

原定义：

`S_i = { Q on z=0 | Pi_i(Q) lies inside source silhouette M_i }`

本版实现：

1. 在原始 source alpha 上直接提取 `alpha = 0.5` 等值轮廓（Marching Squares）。
2. 对 `vhProjectPoint(view, Q)` 限制在 `z=0` 的 2D 仿射映射求逆。
3. 将 source silhouette 轮廓的每一个点通过这个逆映射落到地面。
4. 把得到的同一个 `S_i` 用 polygon / even-odd fill 填充。
5. 最后只做 2–3× coverage rasterization 抗锯齿。

### 明确没有做

- 没有 footprint 推断
- 没有 Visual Hull / 3D 重建
- 没有 blur / erosion / dilation
- 没有去小块、补洞、自动圆角
- 没有改变关键帧光线、源视图或投影公式
- 没有改 `keyframemorph` 的动态转换算法

版本：`v4.17.0-same-math-contour-keyframes`
