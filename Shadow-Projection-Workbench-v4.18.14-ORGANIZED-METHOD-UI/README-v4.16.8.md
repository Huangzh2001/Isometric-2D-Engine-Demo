# v4.16.8 — Rotational Keyframes / Clean Shadow Hull / Grounding

## 1. 建筑真正贴地
- `buildingTiles` 的显示锚点不再用“下半部最宽 alpha 行”猜测。
- 改为按等距底面菱形几何：`south tip - halfY` 得到底面中心，并把该中心严格对齐世界 `z=0`。
- 只修显示注册，不改已经验证的四方向关键帧阴影输入。

## 2. 关键帧之间按影子几何旋转
- 原 `keyframemorph` 改名为“关键帧旋转插值”。
- A/B 两个关键帧的地面 SDF 先围绕 caster 的 `z=0` 地面锚点旋转到当前太阳方位。
- 只有旋转对齐后才做小范围 SDF 过渡，因此主运动是阴影轴绕支点旋转，不是原地图片/SDF morph。
- 四个端点继续直接回到原始精确关键帧。

## 3. Shadow Hull / 点光源去噪
- 删除旧的固定粗步长 ray marching 判定。
- 改为基于 ground-SDF 距离界的确定性自适应区间细分。
- 静止时 1:1 全分辨率渲染；只在真实阴影边缘做固定 3×3 supersampling。
- 拖动时才用 1/2 分辨率预览。
- 不使用随机 jitter / dithering；太阳和点光源共用同一套稳定求交器。

## 4. 为什么四方向关键帧本身一直很干净
- 四个端点直接由源视图投到地面并缓存成 ground-SDF，没有 Shadow Hull 的射线采样不确定性。
- v4.16.8 保留这条端点路径不动，只修中间角度和点光源路径。
