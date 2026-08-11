# v4.18.12 Validation — Consensus Support

## Direct Shadow Hull preservation

与原 v4.18.11 ZIP 逐函数比较，下列 Direct Shadow Hull 核心函数源码字节一致：

- `shadowHullKeyframeSet`
- `buildWorldToKeyframeAffine`
- `buildContourAccel`
- `buildShadowHullBundle`
- `shadowHullRaySegment`
- `shadowHullRayHit`
- `drawKeyframeShadowHullOnFace`

在 Direct 模式中调整 Consensus 支持阈值前后，Canvas 原始 RGBA hash 完全一致。

## Exact endpoint

Consensus 模式下 K0/K1/K2/K3 四个方向全部得到：

- `projection = exact-source-silhouette-contour-same-math`
- `consensusEndpointBypass = true`

因此 exact endpoint 没有被离散 consensus proxy 替换。

## 100-model support-threshold test

100 个程序生成模型，400 个 model/light cases（每模型 2 个 directional midpoint + 2 个 point-light cases），阈值 0/20/40/60/80/100，共 2400 行。

这里可靠比较的是“同一离散 Consensus representation 内，各阈值相对 0% 最大离散 Hull”的 paired 变化；当前内部 Direct evaluator 尚未完成与旧 analytic benchmark 的同-raster校准，因此本版不使用它宣称 Consensus 胜过 Direct Shadow Hull。

- 0% mean IoU: 0.6334
- 20%: 0.6376，mean Δ +0.0041，明显改善 22.75%，明显变差 0.25%
- 40%: 0.6407，mean Δ +0.0073，改善 40.75%，变差 5.25%
- 60%: 0.6427，mean Δ +0.00925，改善 48.0%，变差 5.25%，worst Δ -0.0235
- 80%/100%: 与 60% 接近；高阈值时 silhouette coverage repair 开始主导，proxy 出现饱和

“明显”定义为 `|ΔIoU| > 0.005`。

60% 对 0% 的 mean FP 从约 0.5305 降到 0.4925，mean FN 从约 0.0650 升到 0.0708。说明共识筛选主要在减少多余体积，但仍不是每个 case 单调改善。

## Compute load

100 模型 ensemble 预处理（24³ / 48 candidates）：mean ~15.6 ms，median ~9.2 ms，max ~72 ms（容器 Chromium/CPU）。只在 proxy build/cache miss 时发生。

10 类代表模型、60% 阈值的实际场景 proxy 投影（方向光+点光源，共20帧）：

- mean render ~9.4 ms
- median ~6.3 ms
- p90 ~20.4 ms
- max ~27.3 ms
- 10 个模型的 mean preprocess ~17.4 ms

这些是当前容器 CPU 数值，不等同于所有机器上的 60fps 保证。

## 判定

新方法可运行、阈值可调、计算量可控，并且比先前 aggressive TV carving 稳定；但它仍不是“每个 case 都变好”。因此保留为独立实验算法，不替换 Direct Shadow Hull。
