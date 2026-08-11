# Shadow Projection Workbench v4.18.11

## Benchmark inspection fix

- 100 个 benchmark 模型的**真实程序 3D 几何**现在被嵌入 `benchmark-geometry.js`，与生成四张 source silhouette 的 `model_library_100.py` 完全同源。
- Benchmark 模式中间场景不再用二维 sprite 冒充测试模型，而是直接绘制真实 3D boxes / rods 构成的 primitive geometry。
- 默认把 benchmark 几何自动居中并放大；默认隐藏接收体，避免遮住测试对象。
- 新增对照面板：真实 3D 模型、Ground Truth 阴影、Direct Shadow Hull 预测、接收体可分别开关。
- Ground Truth 阴影根据当前方向光/点光源直接投影真实 3D primitive；蓝色为 GT，黑色为 Direct Shadow Hull。黑色超出蓝色是 FP；蓝色没被黑色覆盖是 FN。
- 100 模型仍按原 Direct Shadow Hull 36-case mean IoU 从 #001 到 #100 排序，排名不参与算法。
- 修复 v4.18.10 `index.html` 只剩启动壳的问题：本版重新恢复完整 Workbench DOM/UI。
- Benchmark 四方向 silhouette 仍为 data URL，直接双击 `index.html` 不依赖 `assets/benchmark/*.png`，避免 Canvas taint。

## 保留资料

此前所有 `MATH.md`、`ALGORITHM-REFERENCE.md`、`CURRENT-METHOD.md`、`PROVENANCE.md`、`SOURCES.md`、历代 `README-*.md` / `VALIDATION-*.md` 都继续保留。

仍不恢复用户明确不要的 `validation/direct-shadow-hull-ranked-100-models/` 大型离线截图/CSV目录。
