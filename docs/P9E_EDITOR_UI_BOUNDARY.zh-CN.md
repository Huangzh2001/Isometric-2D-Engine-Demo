# P9e：Editor / UI Owner 收口

## 目标

P9e 处理剩余 UI/editor 大节点中的低风险边界职责。目标不是重写 UI 或编辑器行为，而是把大文件中的“服务/控制器访问”和“编辑器健康诊断”迁到明确 owner，避免后续 AI 继续把边界代码堆回 `ui.js` 或 `editor-unified-v18.js`。

## 新增 owner

```text
src/presentation/ui/ui-boundary.js
src/presentation/editor/diagnostics/editor-v18-diagnostics.js
```

## 已迁移职责

### `src/presentation/ui/ui-boundary.js`

负责：

```text
emitP1bUi
readEditorHandoff
clearEditorHandoff
getUiAssetWorkflow
getUiSceneWorkflow
getUiEditorHandoffService
getUiMainController
getUiSceneController
getUiPlacementController
getUiAssetLibraryController
uiDispatchController
uiDispatchControllerCommand
uiDirectPatchRenderSettings
```

这些函数属于 UI-side boundary / service-controller access，不应继续由 `ui.js` 直接拥有。

### `src/presentation/editor/diagnostics/editor-v18-diagnostics.js`

负责：

```text
createHealthReporter
window.__EDITOR_V18_DIAGNOSTICS__
```

`editor-unified-v18.js` 只消费该 reporter，不再直接持有 `__editorHealthCheck` owner。

## 加载顺序

主程序：

```text
ui-boundary.js
  ↓
ui-tabs.js / ui-inspectors.js / ui-habbo-library.js
  ↓
ui.js
```

主编辑器：

```text
editor-v18-diagnostics.js
  ↓
editor-unified-v18.js
```

## 非目标

本轮没有修改：

```text
UI 控件行为
编辑器画布逻辑
prefab/scene 数据协议
editor 保存/导入/导出流程
主程序 placement/render 行为
```

## 检查命令

```bash
node tests/editor-ui-boundary.test.js
node scripts/check_editor_ui_boundary.js
node scripts/check_project_hygiene.js
```
