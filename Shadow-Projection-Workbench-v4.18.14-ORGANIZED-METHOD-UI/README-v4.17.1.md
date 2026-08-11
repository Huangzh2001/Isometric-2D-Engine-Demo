# Shadow Projection Workbench v4.17.1

本版修复 v4.17.0 的关键遗漏：v4.17.0 只修改了静态 `keyframe`，但点光源会自动切换到 `shadowhull`，因此用户实际测试点光源时仍然看到旧算法。

## Shadow Hull 数学定义不变

四个关键帧仍然定义四个 silhouette 约束。对空间点 P，第 i 个约束仍然是：

`Pi_i(P) ∈ M_i`

Shadow Hull 仍然是四个约束的交集。没有引入 footprint、高度图或新的 3D 模型。

## 数值实现改变

旧版：
- 关键帧先离散为 ground-SDF 网格；
- 点光源射线使用自适应 ray marching / Lipschitz pruning；
- 拖动时降为 1/2 分辨率。

v4.17.1：
- 直接使用与精确关键帧完全相同的源 alpha=0.5 连续轮廓；
- 对每条点光源/平行光射线，直接求 `Pi_i(P(s))` 与源轮廓的解析交点参数区间；
- 四个视图的 inside 区间直接求交；
- 不再使用 ground-SDF 网格；
- 不再使用 ray marching；
- 拖动时也保持 full resolution；
- 边缘静止 3×3 coverage AA，拖动 2×2 coverage AA。

因此这是**同一个 Shadow Hull 数学模型的连续轮廓/解析求交实现**，不是更换阴影模型。
