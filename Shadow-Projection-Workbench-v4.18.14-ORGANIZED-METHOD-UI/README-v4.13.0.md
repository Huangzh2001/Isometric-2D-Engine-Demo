# Shadow Projection Workbench v4.13.1

## 新增
- 保留 Footprint 查看器，可把当前素材估计出来的 footprint 直接高亮画在原始输入图上。
- 新增独立方法：**固定线投影**。

## 说明
### 1. Footprint 查看器
- 蓝色虚线：外部 proxy / 放置单元
- 绿色区域：估计出来的 footprint
- 橙色线：当前光照方向下的支撑基线

### 2. 固定线投影
- 完全不估计 footprint。
- 直接在物体底面放置一条固定基线窄带，然后从这条线出发投影。
- 作用：和 Footprint 支撑边界阴影做直接 A/B 对比。

## 额外修复
- 渲染阶段增加 runtime-error 保护，避免部分素材直接白屏。
