# Validation — v4.18.3

## 验收标准

1. 四个关键方向必须严格走原 exact renderer。
2. 连续解在关键帧附近必须收敛，不允许靠大阈值突然切换。
3. 中间帧必须是单一硬 shadow，不允许 alpha 双影。
4. 方向光与点光源分别使用各自严格投影公式。
5. 不只测金字塔：所有当前具有四个 exact keyframe 定义的代表素材都要跑视觉和连续性回归。

## 1. 静态/数学测试

通过：

- `node --check app.js`
- `test_math.js`：6/6
- `test_contour_accel.js`
- `test_keyframe_pairing.js`
- `test_directional_keyframe_path.js`
- `test_v4183_ray_transport_math.js`
- `index.html` 中全部 inline scripts 逐段 `node --check`

`test_v4183_ray_transport_math.js` 验证：

- 方向光 per-point 圆轨迹与 `z cot(alpha)` 半径；
- 点光源中心投影；
- 固定高度/半径点光源绕行时 per-point 圆轨迹；
- 方向光端点 support 权重收敛；
- A 方法运行入口确实是 ray transport 且有 exact endpoint bypass；
- `index.html` 无外部 JS/CSS/fetch/XHR 运行依赖。

## 2. 四角 exact + 连续性密集扫描

测试素材（10 个，均有当前工程定义的四个 exact keyframe）：

- toilet
- chair
- pyramid-test
- tree-local
- lamp-local
- statue-local
- taxi-oct8
- terrain-channel-low
- terrain-channel-wall
- terrain-channel-slope

每个素材四个区间均采样 `t=.01,.05,.1,.25,.5,.75,.9,.95,.99`，并单独检查四个 exact corner。

结果：

| Asset | 4 corners exact | min near-endpoint IoU | max components | max coarse area step | max coarse centroid step |
|---|---:|---:|---:|---:|---:|
| toilet | yes | 1.000 | 1 | 0.108 | 0.388 |
| chair | yes | 1.000 | 1 | 0.081 | 0.244 |
| pyramid-test | yes | 1.000 | 1 | 0.081 | 0.439 |
| tree-local | yes | 1.000 | 1 | 0.061 | 0.776 |
| lamp-local | yes | 1.000 | 1 | 0.231 | 0.713 |
| statue-local | yes | 1.000 | 1 | 0.112 | 0.622 |
| taxi-oct8 | yes | 1.000 | 1 | 0.167 | 0.311 |
| terrain-channel-low | yes | 1.000 | 1 | 0.072 | 0.104 |
| terrain-channel-wall | yes | 1.000 | 2 | 0.068 | 0.110 |
| terrain-channel-slope | yes | 1.000 | 1 | 0.103 | 0.213 |

`terrain-channel-wall` 的 2 个 component 来源于其地形 shadow topology；不是透明双影。

四个 corner 的实际 renderer metadata 对所有 10 个素材均为：

`exact-source-silhouette-contour-same-math`

中间方向光和点光源均为：

`keyframe-consistent-ray-transport`

## 3. 浏览器视觉回归

最终入口内容通过 Chromium `page.set_content(index.html)` 实际运行。系统 Chromium 的企业策略禁止 `file://` 导航，因此浏览器自动化不能直接 file-URL 打开；但被执行的是同一份自包含 `index.html` 内容。

画面回归：

- 方向光：10 个素材 × `t=0,.1,.25,.5,.75,.9,1`
- 点光源：10 个素材 × `t=.1,.25,.5,.75,.9`
- 共 120 个画面状态
- runtime error：0
- endpoint renderer 错误：0
- 中间 projection metadata 错误：0

最终 montage：`validation/ALL-MODELS-MIDFRAMES-FINAL.jpg`

## 4. 已知真实几何：金字塔 ground truth

`pyramid-test` 使用已知几何（2×2 方形底面，apex 高度 1.85），真实 shadow 由 5 个 3D 顶点按当前光源严格投影后取凸包。候选方法 mask 与 analytic ground truth 比较 IoU：

### Directional

- t=.10: 0.9204
- t=.25: 0.8915
- t=.50: 0.8933
- t=.75: 0.8403
- t=.90: 0.9204

### Point light

- t=.10: 0.8873
- t=.25: 0.8821
- t=.50: 0.9517
- t=.75: 0.8041
- t=.90: 0.8034

这说明方法具有正确的物理运动趋势，但不是精确真实 3D 重建；点光源后半区间仍有约 20% mask 差异，是当前主要误差来源。

原始数据：`validation/pyramid-groundtruth.json`。

## 5. 人物为何没有列入上述 10 个

当前 `player-local-cardinal4` 在工程语义中没有四个斜向 exact keyframe 定义，`keyframePreviewSupported()` 明确排除 player。这里没有偷偷生成四张伪关键帧；人物 A 方法支持应作为单独的数据/语义设计任务处理。
