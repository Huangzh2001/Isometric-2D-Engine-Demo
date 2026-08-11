# Shadow Projection Workbench v4.17.5 — HEIGHT GRID CELL FIX

## 修复内容
v4.17.4 的关键帧高度代理已经成功反推出 72×72 高度网格，但渲染器读取 `proxy.dx / proxy.dy` 时，这两个字段没有被写入 proxy，导致所有柱体顶点坐标变成 NaN。

日志中的 `projectionFailures=41472` 恰好等于 `72×72×8`，说明每个高度网格柱体的 8 个顶点全部投影失败。

v4.17.5：
- `buildKeyframeHeightProxy()` 明确保存 `dx` / `dy`；
- `drawKeyframeHeightColumnsOnFace()` 增加 fallback：若字段缺失，自动用 `outer.w/res`、`outer.d/res` 重新计算；
- 日志新增 `cellSize:{dx,dy}`；
- 新增 `test_height_proxy_projection.js`，用金字塔 72×72 参数验证方向光和点光源均能得到有限投影点。

高度反推公式、四方向精确关键帧以及 Shadow Hull 均未改动。
