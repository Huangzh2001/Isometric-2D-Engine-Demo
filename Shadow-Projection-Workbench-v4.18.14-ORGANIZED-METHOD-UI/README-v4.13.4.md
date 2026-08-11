# v4.13.4 Footprint inference fix

重点修两个截图中暴露的问题：

1. 单图素材（树/灯等）：底部接地点已经找对时，不再因为 hull 面积太小而回退成整个 proxy。只使用一张真实图的接触宽度，并用对称方形先验补足未知深度。
2. 地形 tile：Footprint 查看器与 support baseline 改用 sourceGrid 的 130×66 等距地面标定，不再使用竖直 Sprite card 的通用映射。
3. 真多视图素材：接地点近似共线时只做局部最小厚度正则化，不再回退大矩形 proxy。
4. 金字塔保持原有 visible-edge shrinkwrap 路径。
