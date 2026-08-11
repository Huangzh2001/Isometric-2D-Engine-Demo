# Shadow Projection Workbench v4.18.12 — Consensus Support

## 新增独立算法：Consensus Support

原 `Direct Shadow Hull` 保持为独立算法，核心函数未修改。新增 `Consensus Support · 多解共识`：

1. 从四张 calibrated silhouette 的可行区域建立离散候选集合（默认 24³）。
2. 生成 48 个随机的、保持离散 silhouette ray 覆盖的可行子解。
3. 对每个候选 cell 统计它在多少子解中仍然存在。
4. UI 的“支持阈值”可在 0–100% 调整：阈值越高，只保留被更多可行解共同支持的 cell。
5. 阈值筛选后若某条 source silhouette ray 失去覆盖，会用最高支持度 cell 做最小覆盖修复，保证离散四视图约束不被筛选破坏。
6. 方向光四个 exact keyframe 仍直接旁路到原 `exact-source-silhouette-contour-same-math` renderer。

这是实验性的共识估计，不是严格概率，也不是 100% 正确的 3D 下界。只有“所有合法连续 3D 解的严格交集”才是严格下界；当前方法使用有限随机离散可行解来近似支持度。

## UI

`Direct Shadow Hull · 独立` 和 `Consensus Support · 新方法` 是两个不同模式。选择 Consensus 后出现“支持阈值”滑杆（5% 步长）。Benchmark 对照面板中的黑色统一表示“当前预测阴影”。

## 包内容

保留全部历史 Markdown 思路/验证资料；不包含之前体积很大的 `validation/direct-shadow-hull-ranked-100-models/` 离线图片/CSV目录。
