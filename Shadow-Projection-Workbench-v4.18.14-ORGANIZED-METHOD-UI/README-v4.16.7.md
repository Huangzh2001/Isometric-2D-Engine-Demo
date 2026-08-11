# v4.16.7 — Performance / Point Light / Grounding

## 1. 性能
- 四方向精确关键帧改为 caster-local world-grid cache，不再每帧扫描整个 floor + supersample。
- 同一素材/方向的缓存与 caster 的 X/Y 平移解耦，拖动物体时复用缓存。
- Shadow Hull 静止按 1/2 分辨率光栅，拖动时 1/4 分辨率预览，并减少 ray marching / refine 次数。

## 2. 点光源
- 点“点光源”时，若当前是 keyframe/keyframemorph，会自动切换到 shadowhull。
- 点光源使用 Q→pointLight 的逐点射线；太阳使用全局平行方向，因此两者会产生不同的透视/发散效果。
- 切换点光源后自动选中光源，直接拖 XYZ 即可。

## 3. terrain
- 三个 terrain-channel 仍然作为完整立体“蛋糕”参与阴影，没有删除任何部分。
- raised terrain 的 z=0 从“顶部 tile 平面”改为“底部支撑菱形中心”，使整个 tile 位于地面之上，而不是让侧壁落到地面以下。

## 4. 建筑贴地
- buildingTiles 的阴影输入不改。
- 显示层从素材下半部估计 isometric 底座中心，并将该点对齐世界 z=0；不再把 PNG 最底点当建筑世界中心。
