# Shadow Projection Workbench v4.18.4 — HIGH-PRECISION FOUR-WAY RAY TRANSPORT

## A 方法

四个精确关键帧保持原定义不变。中间帧使用：

1. 四个 exact ground-shadow masks；
2. 四关键帧一致性约束反推每个 shadow cell 的最低合法高度；
3. 把每个 shadow cell 当作真实地面小面积，而不是单点/splat；
4. 用严格 directional / point-light 投影把四个关键帧各自传输到当前光源；
5. 对四个传输结果计算 signed distance fields；
6. 按当前光源方位与四个关键方向的角距离做 Shepard 权重；
7. 四个 SDF 加权后只提取一个零水平集，得到单一硬阴影。

方向光关键帧处直接调用原 exact renderer：

`exact-source-silhouette-contour-same-math`

## 精细度原则

本版 A 方法明确不使用下面手段提高 benchmark 分数：

- blur
- dilation
- erosion
- morphological closing
- 3-point splat
- alpha 双影混合

发布网格最高 256；拖动预览 112。

## 运行

解压后直接双击 `index.html`。它是自包含入口。
