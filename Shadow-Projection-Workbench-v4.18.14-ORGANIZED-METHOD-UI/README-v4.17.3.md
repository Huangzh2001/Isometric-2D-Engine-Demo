# Shadow Projection Workbench v4.17.3 — KEYFRAME HEIGHT PROXY

## 这次只做两件事

### A. 连续方法 A 改成“关键帧高度代理”
- 不再把 `keyframemorph` 解释为 **Z 轴旋转轮廓**。
- 现在它的数学含义是：
  1. 先保留四个**精确关键帧**地面阴影；
  2. 把四个关键帧阴影统一到同一地面坐标；
  3. 在 footprint 内每个地面单元上，沿四个关键方向分别测量阴影延伸距离；
  4. 用 `h = min_i(extent_i * |d_z| / |d_xy|)` 反推单值高度代理 `H(x,y)`；
  5. 任意中间角度的阴影都由 `H(x,y)` **重新投影**，而不是关键帧之间做图像插值。
- 当当前方向恰好落在某个关键帧端点时，仍然**严格回退到精确关键帧**。

### B. 保留 Shadow Hull 作为并列可选方法
- `shadowhull` 仍然保留。
- 现在界面上 A/B 的含义是：
  - A = 关键帧高度代理
  - B = Shadow Hull

## 代码层面修改
- `keyframemorph` UI 标签改为 **A · 关键帧高度代理**。
- `drawKeyframeGroundSdfMorphOnFloor()` 现在改为调用新的 `drawKeyframeHeightProxyOnFloor()`。
- 新增：
  - `buildKeyframeHeightProxy()`
  - `shadowExtentAlongDirection()`
  - `smoothHeightGrid()`
  - `pointInLoopsEvenOdd()`
- 保留原先的 Shadow Hull 路径不动。

## 这版的定位
这是一个**实验版**：
- 目标是验证“由四个关键帧反推单值高度代理，再投影”这条路线是否比以前那种连续方法更合理；
- 它更适合建筑/金字塔/近似单值高度的物体；
- 对悬空、穿孔、多层结构，仍然可能不充分；
- 如果需要真实点光源逐点透视约束，仍建议用 Shadow Hull。
