本轮只处理 `src/application/assets/asset-import.js` 的 application boundary：
- 减少它对 `prototypes` / `editor.mode` / `ui.prefabSelect` / 旧入口的直接依赖
- imported prefab 导入后，优先通过 state / controller / assetWorkflow 编排
- 新增 `asset-import-boundary-*` 专项验收项
