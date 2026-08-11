# Shadow Projection Workbench v4.17.7 — LIGHT-DRIVEN FIELD MORPH

## A 方法彻底重做

`A · 光源驱动 Field Morph` 不再使用 Height Proxy / voxel shadow intersection。

运行链路：

1. 保留四个严格精确关键帧 `S0..S3`，端点不改。
2. 建立相邻关键帧之间的 feature-line correspondence。
3. 对对应 feature 的四个平行光投影射线做最小二乘交会，得到**稀疏 3D 控制 feature**；只重建控制 feature，不恢复完整 3D 体积。
4. 当前光源为平行光时，控制 feature 按平行投影落到地面：

   `q = P_xy - z * d_xy / d_z`

5. 当前光源为点光源 `L` 时，控制 feature 按中心投影落到地面：

   `q = L_xy + L_z/(L_z-z) * (P_xy-L_xy)`

6. 目标 feature-line 得到后，使用 Beier–Neely directed-line reverse mapping，把相邻两个精确 shadow warp 到同一个目标 feature 结构。
7. 按 morph 参数做 cross-dissolve；静止时 2× coverage，拖动时 1×。

## Beier–Neely 数学

对目标 feature line `PQ` 和源 line `P'Q'`，目标点 `X` 的局部坐标：

`u = dot(X-P,Q-P) / ||Q-P||²`

`v = dot(X-P,perp(Q-P)) / ||Q-P||`

对应源位置：

`X' = P' + u(Q'-P') + v * perp(Q'-P')/||Q'-P'||`

多条线时：

`D_i = X'_i - X`

`weight_i = ((length_i^p)/(a+dist_i))^b`

`X' = X + sum(weight_i D_i)/sum(weight_i)`

本版取：`b=1.5, p=0.5`，`a` 按 caster footprint 尺寸做很小的比例缩放，避免线上的数值奇异。

## correspondence

### 单图四方向复用
例如 `tree.png`：四个关键帧来自同一 source silhouette。

此时直接用同一个 source alpha=0.5 contour 的相同 UV 采样作为四方向 correspondence；不会把“只有一张 PNG”误判成“只有一个关键帧”。

### 真四方向不同图
按轮廓面积匹配 loop；在方位归一化后做方向/循环起点对齐，再建立对应 feature。

这是自动 correspondence，是工程层；如果素材间真正的语义对应关系非常复杂，自动匹配仍可能不如人工 feature 标注。

## 点光源支持的精确定义

点光源不再拿“物体中心射线”去旋转整张 shadow。

- **严格部分**：已经得到的每一个稀疏 3D feature，使用真正的中心投影公式投到地面。
- **近似部分**：整个二值 shadow 仍由 Beier–Neely 2D field morph 跟随这些 sparse feature；它不是完整 3D renderer。

所以本版的定位是：

> sparse projective geometry guides mature 2D field morphing.

而不是恢复完整几何。

## 文献基础

- T. Beier, S. Neely, *Feature-Based Image Metamorphosis*, SIGGRAPH 1992.
- X. Zhang, M. Nakajima, image-based tree/building shadow generation work: moving-light-aware shadow keypoints + field morphing / geometric shadow guidance.
- Y. Matsushita et al., *Lighting Interpolation by Shadow Morphing Using Intrinsic Lumigraphs*, Pacific Graphics 2002: point/directional light estimation, geometric shadow prediction, geometry-guided shadow warping.
