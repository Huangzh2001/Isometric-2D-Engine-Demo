# P8e Render Diagnostics 拆分记录

## 目标

本轮目标是继续削薄 `src/presentation/render/render.js`，把其中的渲染诊断、profiling、throttle 状态和结构化日志 emitters 迁出。该类逻辑不是 Canvas 绘制，也不是 core/domain 规则，而是 presentation/render 的诊断辅助能力。

## 新增 owner

```text
src/presentation/render/diagnostics/render-diagnostics.js
```

该文件负责：

```text
render-frame summary logs
static world chunk summary logs
chunk rebuild profiling logs
static renderable build profiling logs
camera / zoom verification logs
static cache invalidation verification logs
static box cache profile state
terrain first-frame diagnostic logs
```

## render.js 保留内容

`render.js` 只保留薄包装，例如：

```text
requireRenderDiagnosticsForRender()
maybeLogRenderFrameSummary(...)
maybeLogStaticBoxCacheProfile(...)
captureStaticBoxCacheFrameState(...)
```

其中详细 terrain profiling 的开关仍暂时由 `render.js` 判断，因为它依赖当前 render settings。

## 未改动内容

本轮没有修改：

```text
Canvas 绘制行为
scene / prefab 数据协议
application/render assembler
static world cache coordinator
core/domain 规则
player / placement / floor editor 行为
```

## 验证命令

```bash
node tests/render-diagnostics.test.js
node scripts/check_render_diagnostics_boundary.js
node scripts/check_project_hygiene.js
```
