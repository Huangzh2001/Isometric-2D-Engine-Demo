# Shadow Projection Workbench v4.17.2

本版只围绕两个目标：

1. 把“4 个精确关键帧之间如何生成连续角度”明确拆成两种可手动选择的方法；
2. 对 Shadow Hull 做结构级性能优化，而不是继续降低输出分辨率。

## 一、两个连续角度方法现在平级可选

工具栏新增独立分组 **“四关键帧连续方法”**：

- **A · Z轴旋转轮廓**（新的主方案）
- **B · Shadow Hull**（保留的实验/对照方案）

点光源不再自动把用户从旋转方法强制切到 Shadow Hull。

### A · Z轴旋转轮廓

四个精确关键帧不变。动态角度不再建立 ground-SDF。

1. 从每个精确关键帧的源 alpha=0.5 等值线得到连续地面轮廓；
2. 读取四个关键帧各自**真实的 shadow forward 方位角**，而不是复用 Sprite 的逻辑 slot 顺序；
3. 根据当前光方向，在真实方位角环上找到相邻关键帧 A/B；
4. A/B 两个地面轮廓分别绕物体 z 轴旋转到当前目标方位；
5. 只有旋转后剩余的轮廓差异才做几何校正：闭合轮廓按弧长重采样、方向校正、循环起点对齐，再插值对应点；
6. w=0/1 直接返回对应旋转后的原关键帧轮廓，不经过重采样，保证端点不被动态算法改写。

平行光是该方法的主要目标。点光源也允许手动选择此方法，但当前使用物体中心射线确定方位，因此属于快速近似；需要每个接收点真实点光源射线时可以手动选择 Shadow Hull。

### B · Shadow Hull

Shadow Hull 的数学定义保留：空间点仍需要同时满足四个 silhouette 约束。它现在只是连续角度方案之一，不再是点光源的强制路径。

四视图信息不足时仍可能产生 phantom volume，这是模型本身的几何过估计，不通过 AA 或增加数值精度掩盖。

## 二、Shadow Hull 性能优化

v4.17.1 虽然去掉了 SDF/ray marching，但每个 shadow-ray 查询仍可能遍历每张源图的全部轮廓边。

v4.17.2 改为：

- 每个关键帧预计算 **world → source UV 的仿射投影**；
- 每条连续 alpha 轮廓建立二维 **uniform-grid edge index**；
- point-in-contour 再建立独立 **Y-bin**；
- shadow ray 投到源图后，仅遍历它穿过的网格单元中的候选边；
- 候选边使用 typed-array stamp 去重，避免每个像素构造大型 Set；
- 静止 raster 结果做小型缓存，非几何 UI 重绘可以直接复用；
- 拖动时仍是 **full-resolution pixel-center** 判定，不再 1/2 放大；
- 拖动期间不再额外做边缘 supersampling，松手后仅对真实边界做确定性 2×2 AA。

## 三、重要诊断字段

### Z轴旋转轮廓

`projection: "z-axis-rotation-plus-contour-residual"`

### Shadow Hull

`projection: "accelerated-analytic-contour-shadow-hull"`

Shadow Hull 还会记录：

- `computeMs`
- `edgeTests`
- `candidateEdges`
- `candidateRatio`
- `gridCells`
- `pointEdgeTests`
- `cachedRaster`

这样下一次性能问题可以直接从导出日志定位，而不是只凭肉眼猜测。
