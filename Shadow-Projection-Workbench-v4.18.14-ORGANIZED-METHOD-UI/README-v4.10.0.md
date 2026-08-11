# v4.10.0 — Reconstruction / Terrain Rebuild

- 新方法正式命名为 **四视图重建算法**。
- 单图素材不再 silent fallback；重建按钮直接不可用。
- 斜四向、人物正四向、真八向继续使用无 voxel 的 direct Visual-Hull ray test。
- Kenney terrain 改为 **4-view calibrated plane-sweep height reconstruction + height-field ray shadow**，用于恢复 silhouette 内部的水渠/凹槽。
- Terrain 修复三个确定性错误：顶面 `z=0` anchor、物理视图顺序 `[0,2,3,1]`、原先过低的高度 AABB。
- Terrain 重建分辨率为 48×48 XY × 65 height planes；最终阴影边缘为 adaptive 4×4 AA。
