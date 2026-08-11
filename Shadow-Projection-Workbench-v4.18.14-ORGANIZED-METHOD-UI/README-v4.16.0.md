# Shadow Projection Workbench v4.16.0 — Keyframe Shadow Hull (Experimental)

本版新增一个新的实验模式：**关键帧 Shadow Hull**。

## 核心思路

不再估计 footprint，也不直接把整张 sprite 拉成长阴影。

而是：

1. 对 NE / SE / SW / NW 四个方向，分别用 **精确关键帧** 方法生成严格的地面阴影关键帧 `K_i`。
2. 对每个 `K_i`，沿该关键帧对应的正交相机射线，反向挤出成一个 3D 约束体 `V_i`。
3. 四个约束体求交，得到一个 **shadow visual hull**：
   
   `H = ∩ V_i`
4. 对任意当前太阳方向 `(水平角 + 俯仰角)`，对接收点 `Q` 反向追 shadow ray；若 ray 与 `H` 相交，则 `Q` 在阴影里。

## 这一版的意义

这个方法的输入不是原始 sprite silhouette，而是 **已经验证过更可靠的地面关键帧阴影**。
因此它更接近“用正确的投影去重建一个用于再投影的 shadow hull”。

## 当前实现状态

- 已集成到 UI，新按钮：**关键帧 Shadow Hull**
- 水平角和俯仰角都会参与
- 当前实现为：
  - 四关键帧地面阴影缓存
  - Shadow Hull 约束
  - 对接收点做离散 ray marching + 局部细化
- 属于 **实验版**，目标是先看视觉趋势是否比单纯 footprint / 拉伸法更可靠

## 已知限制

- 目前本质上仍是 visual hull 类型近似，可能偏“厚”
- 当前 ray-hull 相交使用离散采样，不是闭式求交
- 如果四个关键帧本身有误差，误差会传入最终 shadow hull

## 建议测试对象

优先测试：

- 金字塔
- 树
- 路灯
- 椅子
- 人物（尤其有双脚接触地面的情况）

重点观察：

1. 金字塔是否比之前少了错误多影
2. 大 footprint 物体是否比经典法更稳定
3. 俯仰角变化时阴影是否比 ground-SDF 水平插值更合理
