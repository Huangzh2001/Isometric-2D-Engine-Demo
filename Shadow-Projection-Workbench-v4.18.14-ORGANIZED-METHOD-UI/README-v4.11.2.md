# Shadow Projection Workbench v4.13.1

新增 Footprint 估计查看器。

## 新功能
- 新增“查看 Footprint”按钮。
- 把当前素材估计出来的 footprint 直接高亮画在原始输入图上。
- 蓝色虚线：proxy / 外部放置单元。
- 绿色区域：最终估计 footprint。
- 橙色线：当前光照方向下的支撑基线。

## 用途
用户可以逐个素材检查：
1. footprint 是否方向正确；
2. 收缩是否过度或不足；
3. 当前素材究竟走的是 4 视图 visible-edge footprint、tile-static，还是 proxy-static-rect。
