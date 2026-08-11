# v4.8.0 validation

已执行：

- `node --check app.js`：通过
- `node test_math.js`：全部通过
- `python validate_cz_assets.py`：全部通过
- HTML 本地脚本 / CSS 引用存在性检查：通过

本地素材族覆盖：

- toilet diagonal4 — 4 views
- chair diagonal4 — 4 views
- pyramid terrain4 — 4 views
- player cardinal4 — 4 views
- tree / lamp / statue — single-view fallback
- taxi oct8 — 8 views
- terrain A / B / C — each 4 views

高度模式回归检查：

- `drawHeightSliceShadowOnFace` 中不存在 `convexHull2`
- 不存在旧的 8 顶点 vertical-prism `pts3`
- 不存在旧的 `z1 = caster.z + H(x,y)` 柱体投影路径

说明：当前容器中的 Chromium headless 无法正常退出，因此没有宣称完成浏览器截图级视觉验证；已完成语法、数学测试、素材覆盖和静态运行依赖检查。
