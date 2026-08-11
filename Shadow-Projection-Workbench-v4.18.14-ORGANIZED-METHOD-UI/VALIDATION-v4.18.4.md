# VALIDATION — v4.18.4

## 1. 不允许“做粗”蒙混

Ground truth 与候选算法在同一个高分辨率二值网格上比较。最终候选不使用 blur、dilation、erosion、closing 或边缘容差膨胀来提高 IoU。

评价指标同时包含：IoU、Dice、边界 Chamfer、95% boundary distance、Hausdorff、细结构 recall、面积误差。

## 2. 24 个程序化真实 3D 模型

覆盖：box、pyramid、wedge、L/U 建筑、arch frame、table、chair、antenna、utility pole、street lamp、gantry、cantilever、fork tree、tree canopy、wind turbine、multi rods、ladder、staircase、offset tower、cross frame、two towers bridge、thin cables、asymmetric sculpture。

真实 ground-truth shadow 直接由三角网格在当前方向光/点光源下投影到 z=0，再做三角形投影并集；不是从候选 mask 生成。

测试窗口扩到足够容纳低仰角长阴影；点光源高度始终高于模型最高点。

### 512 broad benchmark — selected `sdf4_angular`

- mean IoU: **0.799188**
- directional IoU: **0.808528**
- point-light IoU: **0.780508**
- mean Dice: **0.884413**
- mean boundary Chamfer: **1.194 px**
- h95 boundary distance: **4.190 px**
- mean Hausdorff: **5.912 px**
- thin-structure recall: **0.884432**
- mean area error: **0.141856**
- 10th-percentile IoU: **0.657334**
- worst IoU: **0.411685**

与相邻双关键帧 `pair_sdf` 相比，四向 angular SDF 提高平均 IoU、方向光/点光源 IoU、10% 最差分位和最坏样本，并降低面积误差，因此采用四向版本。

## 3. 高分辨率细结构复测

1024 resolution，antenna / utility pole / street lamp / ladder / thin cables / wind turbine 共 36 个光照 case：

- mean IoU: **0.843598**
- mean thin-structure recall: **0.967106**
- mean boundary Chamfer: **0.699 px**

2048 antenna 复测没有出现“分辨率越高分数越高”的假象；反而暴露 minimum-legal-z 的结构性歧义。这说明 512/1024 的成绩不是靠粗像素把误差糊掉。该方法不宣称恢复真实唯一 3D。

## 4. 项目真实浏览器回归

10 个具有四个 exact keyframe 的项目素材：toilet、chair、pyramid、tree、lamp、statue、taxi、3 种 terrain/channel。

- 方向光：7 帧/模型
- 点光源：5 帧/模型
- 总计：**120 个实际浏览器画面**
- runtime errors: **0**
- 空阴影: **0**
- 中间帧 projection: `high-precision-fourway-ray-transport`

另外对 10 个素材的 4 个关键方向逐个检查，共 **40/40**：

`projection = exact-source-silhouette-contour-same-math`

即四个角全部直接使用原 exact renderer。

## 5. 连续性

四个完整方位区间对 chair / pyramid / tree / lamp 做密集采样。

极限测试中，最敏感的细长 `lamp`：

- t = 0.0001 → IoU(exact endpoint) = **1.000**
- t = 0.00025 → **1.000**
- t = 0.0005 → **1.000**
- t = 0.001 → **1.000**
- t = 0.002 → **1.000**
- t = 0.005 → 0.9596

因此连续解在端点极限确实收敛到 exact mask；不是在关键帧处突然切换另一张阴影。

## 6. 浏览器内真实金字塔 3D ground truth

使用真实 pyramid 顶点直接投影出目标 ground truth，与 v4.18.4 页面内部算法比较：

Directional 5 个中间位置：
- IoU range: **0.8577 – 0.9217**
- mean: **0.8926**

Point light 5 个中间位置：
- IoU range: **0.8276 – 0.9376**
- mean: **0.8649**

## 7. 已知限制

四个 silhouette/shadow keyframes 一般不能唯一确定真实 3D。`minimum legal z` 是一个保守先验，2048 antenna 测试已经显示这个先验在极细高结构上存在结构性歧义。因此本方法定位为“严格关键帧约束下的高精度连续 continuation”，不是声称精确恢复真实三维物体。
