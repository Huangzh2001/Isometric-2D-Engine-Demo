# P9c：Controller / Shell Owner 收口

## 目标

本轮不继续拆 `render.js`，而是处理另一组历史大节点：

```text
src/application/controllers/app-controllers.js
src/presentation/shell/app.js
src/presentation/shell/app-shell.js
```

目标是将“边界审计 / 诊断配置”从大文件中迁出，使大文件更专注于自身主职责。

## 新增 owner

```text
src/application/controllers/controller-boundary.js
src/presentation/shell/diagnostics/shell-diagnostics.js
```

## 迁移内容

### controller-boundary.js

迁出原 `app-controllers.js` 顶部的 controller boundary/audit 相关职责：

```text
emitP7
getNs
appPath
safeClone
recordAppBoundaryEvent
recordAppBoundaryFallback
summarizeAppBoundary
resetAppBoundary
```

`app-controllers.js` 现在只保留薄包装，并继续负责 application action orchestration。

### shell-diagnostics.js

迁出原 `app.js` 顶部 function trace 诊断配置：

```text
summarizeTraceArg
traceFunctionCall
installFunctionTrace
__functionTraceSpec
__FUNCTION_TRACE_INFO
```

`app.js` 继续负责主循环、canvas/DOM 事件接线和 runtime shell 行为。

## 加载顺序

```text
controller-boundary.js
  ↓
app-controllers.js

shell-diagnostics.js
  ↓
app-shell.js
  ↓
app.js
```

## 不改变的内容

本轮未修改：

```text
scene / prefab 数据协议
render pipeline
Canvas 绘制
player / placement 行为
asset workflow
server / storage 行为
```

## 验证

```bash
node tests/controller-shell-boundary.test.js
node scripts/check_controller_shell_boundary.js
node scripts/check_project_hygiene.js
```
