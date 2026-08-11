# Shadow Projection Workbench v4.18.10

## 本版修复

- 修复 v4.18.9 在直接双击 `index.html` 时，100 个 benchmark 模型因 `file://` Canvas taint 导致四张 source silhouette 全部加载失败的问题。
- 400 张 benchmark silhouette 已内嵌为 `data:image/png;base64,...`，不再依赖 `assets/benchmark/*.png` 文件，也不会经过跨源 Canvas。
- 100 个 benchmark 模型仍直接存在于引擎模型列表 #001–#100，并按 Direct Shadow Hull 原 benchmark mean IoU 从好到差排列。
- Direct Shadow Hull 仍为独立算法；drag/static 使用相同几何与 adaptive 4×4 edge coverage AA；四个 exact directional endpoints 继续旁路到 exact contour renderer。
- 恢复此前所有顶层 Markdown 历史/数学/算法/验证文档。
- 仍不包含 `validation/direct-shadow-hull-ranked-100-models/` 的 overview/details/geometry/CSV 离线检查大目录，避免重复膨胀包体。

## 运行

直接双击 `index.html`。

## 重要说明

100 个 benchmark 模型的四张输入 silhouette 已经嵌在 `app.js` 中，因此即使使用 `file://` 打开，也不应再出现 `CanvasRenderingContext2D.getImageData ... canvas has been tainted`。
