# P8X FINAL HANDOFF

## 当前阶段

当前项目已经完成 P0～P7 主骨架重构，进入 **P8X 总收尾阶段**。P8X 合并了原先的 P8 / P9 / P10，目标是不再新增大块结构，而是集中做低风险收尾。

## 已完成的四层归宿

1. **Renderer Adapter**
   - 主执行入口：`App.renderer.active`
   - 具体实现：`src/presentation/render/renderer/canvas2d-renderer.js`
   - `render.js` 已退化为渲染描述 / fallback 层。

2. **App / UI Controller**
   - 主入口：`App.controllers.*`
   - 统一分发：`App.controllers.dispatch(controllerName, action, payload)`
   - `src/presentation/ui/ui.js` / `src/presentation/ui/ui-habbo-library.js` / `src/presentation/shell/app.js` 已优先走 controller dispatch。

3. **Domain Core**
   - 主入口：`App.domain.sceneCore`
   - 负责放置判定、占地、排序、遮挡等纯函数规则。

4. **Asset / Scene Service**
   - 主入口：`App.services.assetWorkflow` / `App.services.sceneWorkflow`
   - 负责 prefab 扫描、Habbo library、scene save/load 与 startup restore orchestration。

## 当前应优先验证的主链

1. `Habbo library → import → place`
2. `editor → main → prefab rescan/select → place`
3. `scene save/load/import`
4. `startup restore / asset scan`

## 当前故意保留的 compat 壳

这些壳当前仍被故意保留，优先保障行为稳定：

- `saveScene`
- `loadScene`
- `refreshInspectorPanels`
- editor/runtime globals
- `asset-management-ownership-check`
- `legacy-habbo-prefab-repair`

## 继续收尾时的原则

- 不再进行跨层大拆分。
- 优先删重复入口、冗余 fallback、只剩中转意义的 wrapper。
- 每次收尾都要保留可判定日志，避免以后无法快速确认主链是否回归。
- 如果某个 compat 壳一旦删除会影响 editor-return 或 Habbo 导入主链，宁可暂时保留。


## P8X-fix2
- 修复 Habbo root 设置链在 prompt 预填值场景下可能出现的重复路径拼接。
- UI 点击入口改为本地捕获错误，避免把可恢复错误抛成 window-unhandledrejection。
- Habbo library 打开 / 刷新 / 设置根目录现在优先以状态提示方式失败，而不是中断主链。
