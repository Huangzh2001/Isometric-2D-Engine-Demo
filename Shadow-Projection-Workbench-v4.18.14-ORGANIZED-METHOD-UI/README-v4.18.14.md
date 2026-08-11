# Shadow Projection Workbench v4.18.14 — Organized Method UI

This release reorganizes the runtime UI without changing the retained shadow algorithms.

## Visible method families

1. **体素投影阴影**
   - 基础体素投影 (`voxel`)
2. **精灵图投影变换**
   - 视图基准线变换 (`viewline`) — intended mainly for small-footprint sprites
3. **高度图投影阴影**
   - 连续高度图投影 (`height`)
4. **四向关键帧插值阴影**
   - 四向关键帧插值 (`keyframemorph`)
   - 仅检查精确关键帧 (`keyframe`)
5. **四视图 3D 重建**
   - SDF 四视图重建（AABB） (`reconstruct`)
   - 关键帧约束解析重建 (`shadowhull`)
   - AABB + 关键帧约束解析重建 (`aabbhull`)
   - 多解支持筛选 (`consensus`)

## Archived from the normal UI

The following implementations remain in source code and are not deleted, but are hidden from the normal method selector:

- `sprite` — 经典四向阴影
- `baselinetiles` — 基准线分块投影
- `support` — Footprint 支撑边界阴影

## Small startup optimization

The asset selector is still available immediately, but the 125 thumbnail cards in the asset browser are now constructed only when the user first opens **素材库**. This avoids creating/decoding the entire thumbnail grid during startup.

No shadow-math function was modified for this optimization/UI cleanup.
