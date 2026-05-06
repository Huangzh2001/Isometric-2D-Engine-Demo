# Canonical Owner Map

本文档用于约束后续 AI 或开发者按 `AGENTS.md` 的四层结构修改代码。P2b 之后，旧 `src` 顶层源码副本已经不再保存在 `src/infrastructure/legacy/top-src/`，不能再通过“整体塞进 legacy”来回避职责划分。

## 一、当前主入口

| 功能区域 | 当前入口 / 主路径 | 备注 |
|---|---|---|
| 主程序 | `index.html` | 加载四层结构下的主程序脚本 |
| 主编辑器 | `START_V18_ONLY.html` | 加载 `src/presentation/editor/editor-unified-v18.js` |
| 地板编辑器 | `START_FLOOR_EDITOR.html` | 加载 floor editor 的 core / application / presentation 链路 |
| 自动保存 / 回放辅助页 | `AUTO_EDITOR_SAVE_X5.html` | 被 `src/infrastructure/self-check/scenario-runner.js` 引用，暂时保留 |
| 本地宿主 | `server/local_server.py` | 属于 infrastructure，不是业务后端 |

## 二、四层 owner

| 层 | 目录 | 职责 |
|---|---|---|
| presentation | `src/presentation/` | UI、输入、渲染、动画、shell、editor、floor editor 表现层 |
| application | `src/application/` | 用户动作编排、控制器、应用流程、跨模块调度 |
| core | `src/core/` | 状态模型、领域规则、纯计算逻辑、无 DOM / 无平台副作用 |
| infrastructure | `src/infrastructure/` | bootstrap、services、storage、logging、audit、legacy bridge、本地平台适配 |

## 三、任务类型与优先 owner

| 任务类型 | 优先 owner |
|---|---|
| UI 面板、按钮、DOM 交互 | `src/presentation/ui/`；UI 服务/控制器访问 owner 为 `src/presentation/ui/ui-boundary.js` |
| 主 shell 装配、启动与事件接线 | `src/presentation/shell/` |
| Canvas 绘制、渲染表现、sprite 显示 | `src/presentation/render/`；低层 Canvas2D primitive owner 为 `src/presentation/render/renderer/canvas2d-draw-primitives.js` |
| Habbo sprite / proxy 放置偏移、cell/pixel shift、layer local box 等纯计算 | `src/core/domain/habbo-placement-core.js` |
| semantic face 映射、face normal、voxel face world polygon、face merge 坐标、neighbor delta 等纯规则 | `src/core/domain/isometric-face-core.js` |
| terrain face merge signature、sort-band key、side-step break、merge-UV 世界坐标转换、terrain top boundary、merged voxel-face geometry 等纯规则 | `src/core/domain/terrain-render-core.js` |
| 纯几何、命中、AABB、占用表构建等无副作用计算 | `src/core/domain/spatial-geometry-core.js` |
| 玩家输入与动作编排 | `src/application/player/` |
| 玩家步进纯规则 | `src/core/domain/player-step-core.js` |
| 放置流程编排 | `src/application/placement/` 或 `src/application/controllers/` |
| 放置判定 / item facing / face merge 等纯规则 | `src/core/domain/` |
| lighting 状态 | `src/core/lighting/lighting-state.js` |
| lighting UI / render 包装 | `src/presentation/lighting/` |
| 场景快照、保存、加载、恢复 | `src/infrastructure/storage/scene-storage.js` 与 `src/infrastructure/services/scene-api.js` |
| 素材扫描、资源 API、本地资源路径 | `src/infrastructure/assets/` 与 `src/infrastructure/services/` |
| 素材导入流程编排 | `src/application/assets/asset-import.js` |
| 日志、自检、审计 | `src/infrastructure/logging/`、`src/infrastructure/self-check/`、`src/infrastructure/audit/` |
| render-frame summary、chunk rebuild profiling、static cache verification、zoom/camera diagnostic 等渲染诊断 | `src/presentation/render/diagnostics/render-diagnostics.js` |

## 四、旧 `src` 顶层文件的实质归位结果

旧路径不再保留为源码副本。其职责已经按下表归入四层主路径：

| 旧路径 | 归位后的 owner | 处理原则 |
|---|---|---|
| `src/app.js` | `src/presentation/shell/app.js`、`src/application/controllers/app-controllers.js` | shell 只做启动/接线；动作流程进入 controller |
| `src/render.js` | `src/presentation/render/render.js`、`src/presentation/render/renderer/`、`src/core/domain/spatial-geometry-core.js`、`src/core/domain/habbo-placement-core.js`、`src/core/domain/isometric-face-core.js`、`src/core/domain/terrain-render-core.js` | 绘制留 presentation；纯几何、Habbo 放置偏移、face 映射/法向量/世界面片/merge 坐标、terrain face/merge/boundary 几何等纯规则抽到 core |
| `src/logic.js` | `src/presentation/render/logic.js`、`src/core/domain/*` | 与渲染表现强绑定的坐标/光影暂留 render logic；纯规则继续向 core 拆 |
| `src/ui.js` | `src/presentation/ui/*`、`src/presentation/ui/ui-boundary.js`、`src/application/controllers/app-controllers.js` | DOM 同步留 UI；服务/控制器访问进 ui-boundary；用户动作调度进 controller |
| `src/state.js` | `src/core/state/*`、`src/application/state/state-actions.js`、`src/infrastructure/legacy/state-bridge.js`、`src/infrastructure/legacy/state.js` | 新状态进入 core/state；状态写流程进入 application/state；legacy/state 只保留兼容行为，命名空间访问与 legacy placement dispatch 归 state-bridge |
| `src/editor-unified-v18.js` | `src/presentation/editor/editor-unified-v18.js`、`src/presentation/editor/diagnostics/editor-v18-diagnostics.js` | 编辑器表现与交互集中在 presentation/editor；健康诊断归 editor diagnostics |
| `src/player/player.js` | `src/application/player/player.js`、`src/core/domain/player-step-core.js` | 输入/编排在 application；步进规则在 core |
| `src/placement/placement.js` | `src/application/placement/placement.js`、`src/core/domain/*`、`src/infrastructure/adapters/placement-effects.js` | 编排、规则、副作用分层 |
| `src/lighting/lighting.js` | `src/core/lighting/lighting-state.js`、`src/presentation/lighting/*` | 状态与表现分离 |
| `src/logging/logging.js` | `src/infrastructure/logging/logging.js` | 日志属于 infrastructure |
| `src/asset-management/asset-management.js` | `src/infrastructure/assets/asset-management.js`、`src/application/assets/asset-import.js` | 扫描/加载在 infrastructure；导入流程在 application |
| `src/scene-storage/scene-storage.js` | `src/infrastructure/storage/scene-storage.js`、`src/infrastructure/services/scene-api.js` | 存储与 API 适配属于 infrastructure |

## 五、P3 新增 owner

P3 已新增：

```text
src/core/domain/habbo-placement-core.js
```

该文件承接 Habbo imported sprite/proxy 的纯放置数学，包括：

```text
getHabboPlacementShift
pixelShiftToCellShift
cellShiftToPixelShift
getHabboPlacementDecomposition
getHabboPlacementCellShift
getHabboProxyVisualShift
getHabboInstanceVisualShift
getHabboRoomOrigin
getHabboLayerLocalBox
```

`src/presentation/render/render.js` 只允许保留薄包装和 canvas/image/composite 绘制，不应重新实现上述纯计算。

## 六、P2b 后的硬约束

1. `src/infrastructure/legacy/top-src/` 不允许重新出现。
2. `src/` 顶层只能保留 `presentation/`、`application/`、`core/`、`infrastructure/` 四个目录。
3. 新功能不能新建 `src/render.js`、`src/ui.js`、`src/state.js` 等旧路径。
4. 不能把整份旧源码移动到 legacy 作为“整理完成”的替代方案。
5. 如果一个文件同时包含跨层职责，应按“纯规则 → core、流程编排 → application、表现/DOM/Canvas → presentation、平台/日志/存储 → infrastructure”逐步拆分。

## 七、检查命令

```bash
node scripts/check_project_hygiene.js
node scripts/check_main_path_refs.js
```

这两个检查通过只代表结构卫生和主路径引用没有明显回退，不等同于完整功能验收。

## P6a：静态世界 Renderable Builder 归位

`buildStaticWorldChunkRenderables` 已从 `src/presentation/render/render.js` 迁出。新的职责边界如下：

```text
src/application/render/static-world-renderable-builder.js
```

该文件负责：

```text
static world chunk / cells / visible faces
  ↓
static-world-face-packet renderables
  ↓
stats / diagnostics payload
```

它属于 `application/render`，因为它不是纯数学规则，也不是 Canvas 绘制，而是把当前世界状态组织为渲染队列的流程层。

`src/presentation/render/render.js` 只保留：

```text
requireStaticWorldRenderableBuilderForRender()
createStaticWorldRenderableBuilderDepsForRender()
buildStaticWorldChunkRenderables(...)
```

其中最后一个函数只是 thin wrapper。颜色、阴影、材质、日志等 presentation 相关函数通过显式依赖注入传给 builder，避免 application 文件直接依赖 Canvas 或 DOM。

## P6b：静态世界 Render Cache Coordinator 归位

`rebuildStaticBoxRenderCacheIfNeeded` 的主体流程已从 `src/presentation/render/render.js` 迁出。新的职责边界如下：

```text
src/application/render/static-world-render-cache-coordinator.js
```

该文件负责：

```text
scene snapshot / dirty updates / occupancy snapshot
  ↓
static world chunk cache sync
  ↓
collectVisibleRenderables + chunk rebuild orchestration
  ↓
staticBoxRenderCache payload / surfaceStats / profile logs
```

它属于 `application/render`，因为它不是纯几何规则，也不是 Canvas 绘制，而是把场景状态、chunk cache 和 renderable builder 串起来的应用流程层。

`src/presentation/render/render.js` 只保留：

```text
requireStaticWorldRenderCacheCoordinatorForRender()
createStaticWorldRenderCacheCoordinatorDepsForRender()
rebuildStaticBoxRenderCacheIfNeeded(...)
```

其中 `rebuildStaticBoxRenderCacheIfNeeded(...)` 只是 thin wrapper。所有 presentation 相关函数，包括日志、颜色、相机 scope、签名和 profiling hooks，均通过显式依赖注入传给 coordinator，避免 application 文件直接依赖 Canvas、DOM 或 renderer 后端。

## P6c：Main Frame Renderable Assembler 归位

`buildRenderables` 与 `buildMainFrameRenderables` 的主体流程已从 `src/presentation/render/render.js` 迁出。新的职责边界如下：

```text
src/application/render/main-frame-renderable-assembler.js
```

该文件负责：

```text
static world renderables
  + dynamic instance renderables
  + player / actor renderables
  + actor-interaction replacement renderables
  ↓
main frame renderable order
  ↓
final per-renderable frame metadata
```

它属于 `application/render`，因为它不是纯几何规则，也不是 Canvas 绘制，而是把各类 renderable descriptor 组织成当前帧绘制队列的应用流程层。

`src/presentation/render/render.js` 只保留：

```text
requireMainFrameRenderableAssemblerForRender()
buildRenderables()
buildMainFrameRenderables()
```

其中 `buildRenderables()` 与 `buildMainFrameRenderables()` 都只是 thin wrapper。Canvas 绘制、renderer 后端、camera transform 执行、debug overlay 实际绘制仍属于 `presentation/render`，不得迁入 assembler。

加载顺序必须保持：

```text
static-world-renderable-builder.js
  ↓
static-world-render-cache-coordinator.js
  ↓
main-frame-renderable-assembler.js
  ↓
presentation/render/render.js
```

## P7：Render Order Core 归位

下列纯排序规则已从 `src/presentation/render/render.js` 中迁出：

```text
src/core/domain/render-order-core.js
```

该文件负责：

```text
renderable order comparison
sorted static/dynamic renderable stream merge
single dynamic renderable binary insertion
static order signature generation
```

它属于 `core/domain`，因为这些规则只依赖 renderable descriptor 的 `sortKey`、`tie`、`id`、`kind`、`faceKey` 等普通数据，不应访问 Canvas、DOM、localStorage、scene runtime 或 renderer backend。

`src/presentation/render/render.js` 只允许保留：

```text
getRenderOrderCoreApi
requireRenderOrderCoreForRender
compareRenderablesByDomain
mergeSortedRenderables
insertSingleDynamicRenderableIntoSortedOrder
getPlayerMoveFastPathStaticOrderSignature
```

其中后四个函数必须是 thin wrapper 或兼容入口；不能重新实现 merge loop、binary insertion loop 或 static-order signature body。

加载顺序要求：

```text
render-order-core.js
  ↓
static-world-renderable-builder.js
  ↓
static-world-render-cache-coordinator.js
  ↓
main-frame-renderable-assembler.js
  ↓
presentation/render/render.js
```

回归检查：

```bash
node tests/render-order-core.test.js
node scripts/check_render_order_boundary.js
```


## P8：Canvas2D primitive 绘制后端归位

下列低层绘制 primitive 已从 `src/presentation/render/render.js` 中迁出：

```text
drawPolyOn
drawPolyWithOffsetOn
averagePointWithOffset
buildPath2DFromPoints
buildPath2DFromLoops
buildPath2DFromSegments
drawTextBadgeOn
drawMultilineBadgeOn
```

新的 owner：

```text
src/presentation/render/renderer/canvas2d-draw-primitives.js
```

`src/presentation/render/render.js` 只保留 thin wrapper。该文件仍属于 presentation 层，因此可以使用 CanvasRenderingContext2D / Path2D，但不能承载 scene runtime、render cache、renderable assembly、排序、数据协议或应用流程。

## P8b：Canvas2D shadow overlay 绘制后端归位

下列 shadow overlay 绘制 pass 已从 `src/presentation/render/render.js` 中迁出：

```text
drawFaceShadowOverlays
drawFaceShadowOverlaysNoCamera
```

新的 owner：

```text
src/presentation/render/renderer/canvas2d-shadow-overlays.js
```

边界说明：

- `canvas2d-shadow-overlays.js` 属于 presentation/render/renderer 层，可以使用 CanvasRenderingContext2D 的 clipping、stroke、composite 操作；
- shadow union canvas、distance fade、debug logging、light state 等仍通过 `render.js` 的 `createCanvas2dShadowOverlayDepsForRender()` 显式注入；
- 该文件不能承载 scene runtime、render cache、renderable assembly、排序、数据协议或 application flow；
- `render.js` 只保留 thin wrapper，避免重新拥有 shadow clipping/compositing 主体。

检查命令：

```bash
node tests/canvas2d-shadow-overlays.test.js
node scripts/check_canvas_shadow_backend_boundary.js
node scripts/check_project_hygiene.js
```

## P8c：Canvas2D static world face draw-pass 归位

下列静态世界 face / voxel packet 的绘制后端逻辑已从 `src/presentation/render/render.js` 中迁出：

```text
buildStaticWorldPacketProjectionCacheKey
getStaticWorldPacketProjectedGeometry
drawTerrainTopBoundarySegmentsForPacket
drawCachedVoxelRenderable
drawCachedVoxelFaceRenderable
drawStaticWorldFacePacket
```

新的 owner：

```text
src/presentation/render/renderer/canvas2d-static-world-face-draw-pass.js
```

边界说明：

- 该文件属于 `presentation/render/renderer` 层，可以使用 CanvasRenderingContext2D、Path2D 相关 helper、Canvas fill/stroke/translate；
- projection、shadow overlay、terrain material pattern、camera、view rotation 等依赖由 `render.js` 的 `createCanvas2dStaticWorldFaceDrawPassDepsForRender()` 显式注入；
- 它不能承载 scene runtime、render cache coordinator、renderable assembly、排序、数据协议或 application flow；
- `render.js` 只保留 thin wrapper，避免重新拥有 static world face draw-pass 主体。

检查命令：

```bash
node tests/canvas2d-static-world-face-draw-pass.test.js
node scripts/check_canvas_static_world_face_draw_pass_boundary.js
node scripts/check_project_hygiene.js
```

## P8d：Canvas2D floor layer draw-pass 归位

下列 floor layer / floor chunk 绘制后端逻辑已从 `src/presentation/render/render.js` 中迁出：

```text
completeFloorLayerBreakdown
ensureFloorLayerCanvas
computeVisibleFloorChunkKeysForLayer
buildFloorChunkEntryForLayer
drawFloorOutlineToLayer
rebuildFloorLayerIfNeeded
drawFloor
```

新的 owner：

```text
src/presentation/render/renderer/canvas2d-floor-layer-draw-pass.js
```

边界说明：

- 该文件属于 `presentation/render/renderer` 层，可以通过注入的 canvas/context 执行 floor layer 的离屏绘制、chunk 合成和主画布 blit；
- `floorLayerCanvas`、`floorLayerCtx`、`floorLayerCache`、camera、settings、view rotation、profile/diagnostic 写入等依赖由 `render.js` 的 `createCanvas2dFloorLayerDrawPassDepsForRender()` 显式注入；
- 它不能承载 scene/prefab 协议、application/render 组装流程、static world render cache coordinator、排序规则或 server/fetch 逻辑；
- `render.js` 只保留 thin wrapper，避免重新拥有 floor layer draw/cache 主体。

检查命令：

```bash
node tests/canvas2d-floor-layer-draw-pass.test.js
node scripts/check_canvas_floor_layer_boundary.js
node scripts/check_project_hygiene.js
```


## P8e：Render Diagnostics 归位

渲染诊断与 profiling emitters 已从 `src/presentation/render/render.js` 中迁出。新的 owner 为：

```text
src/presentation/render/diagnostics/render-diagnostics.js
```

该文件负责 render-frame summary、static world chunk summary、chunk rebuild profiling、camera/zoom verification、static cache invalidation verification、static box cache profile state、terrain first-frame diagnostic logs 等结构化诊断输出。

`src/presentation/render/render.js` 只保留薄包装与依赖当前 render settings 的局部 gate，不应重新持有诊断 throttle state 或 JSON log construction bodies。

## P9a：Render transitional warning 清理

本轮清理两个遗留 warning：

1. `src/application/render/main-frame-renderable-assembler.js` 不再直接读取 `localStorage` 或 `__actorInteractionOrderDiagState`。actor sort render-entry 诊断通过 `noteActorInteractionRenderEntryForRender(...)` 进入 presentation/render wrapper。
2. `main-frame-renderable-assembler.js` 不再直接执行 `dynamicRenderables.sort(compareRenderablesByDomain)`。dynamic renderable 排序通过 `sortRenderablesByOrderForRender(...)` 委托给 `src/core/domain/render-order-core.js`。

边界归属：

```text
src/core/domain/render-order-core.js
  owns: pure renderable order / sort / merge / insertion rules

src/presentation/render/render.js
  owns: thin wrappers and transitional actor-sort diagnostic bridge

src/application/render/main-frame-renderable-assembler.js
  owns: frame assembly flow only; no localStorage, no direct diagnostic state, no raw comparator sort
```

对应检查：

```bash
node scripts/check_frame_assembler_boundary.js
node scripts/check_render_order_boundary.js
```


## P9b 补充：state / legacy owner 收口

`src/infrastructure/legacy/state.js` 不再直接拥有状态命名空间访问、legacy placement bridge dispatch 和启动阶段 ownership/compat mapping 报告。这些职责迁到：

```text
src/infrastructure/legacy/state-bridge.js
```

当前边界：

```text
src/core/state/*
  负责长期状态容器，例如 runtime、prefab registry、scene session。

src/application/state/state-actions.js
  负责状态写入流程和跨状态动作编排。

src/infrastructure/legacy/state-bridge.js
  负责 legacy state 与 App namespace / placement legacy bridge / boot ownership report 的兼容桥接。

src/infrastructure/legacy/state.js
  仅保留尚未迁出的历史兼容行为，不能继续新增状态 owner。
```

强制检查：

```bash
node tests/state-legacy-boundary.test.js
node scripts/check_state_legacy_boundary.js
```

## P9c 补充：controller / shell owner 收口

本轮将 controller 边界审计状态与 shell function-trace 诊断从历史大文件中迁出，避免 `app-controllers.js` 与 `app.js` 继续承担非业务主流程职责。

| 职责 | Canonical owner | 说明 |
|---|---|---|
| controller namespace lookup / boundary audit | `src/application/controllers/controller-boundary.js` | 负责 `appPath`、controller boundary audit、route/fallback 记录与 summary/reset。 |
| application action orchestration | `src/application/controllers/app-controllers.js` | 保留具体应用动作编排，不再直接拥有 boundary audit 存储。 |
| shell function-trace diagnostics | `src/presentation/shell/diagnostics/shell-diagnostics.js` | 负责 function trace 配置、trace installer 与 `window.__FUNCTION_TRACE_INFO`。 |
| shell runtime loop / DOM event wiring | `src/presentation/shell/app.js` | 保留主循环、DOM/canvas 事件接线，不再持有完整 trace spec 表。 |
| shell bootstrap assembly | `src/presentation/shell/app-shell.js` | 保留启动装配和启动阶段 pipeline。 |

约束：

1. `controller-boundary.js` 必须在 `app-controllers.js` 前加载。
2. `shell-diagnostics.js` 必须在 `app-shell.js` 和 `app.js` 前加载。
3. `app-controllers.js` 不应再出现 `appBoundaryAudit` 的存储主体。
4. `app.js` 不应再出现完整的 `__functionTraceSpec` 表或 `installFunctionTrace` 实现。
5. 新 controller 诊断、route audit 或 shell trace 逻辑，应优先进入上述 owner，而不是回填到大文件。

验证命令：

```bash
node tests/controller-shell-boundary.test.js
node scripts/check_controller_shell_boundary.js
node scripts/check_project_hygiene.js
```


## P9d 补充：render/logic.js 重复定义清理

`src/presentation/render/logic.js` 仍是 transitional 大文件，但不允许再保留同名顶层函数的旧实现覆盖链。

当前规则：

| 职责 | Canonical owner | 说明 |
|---|---|---|
| render logic transitional hub | `src/presentation/render/logic.js` | 暂时保留尚未迁出的渲染交互、lighting/shadow glue，但不得出现同名顶层函数重复声明。 |
| render logic duplicate guard | `scripts/check_render_logic_boundary.js` | 检查 `logic.js` 是否重新出现重复顶层函数声明。 |
| render logic regression test | `tests/render-logic-boundary.test.js` | 固化 P9d 清理结果，防止旧 override 链回流。 |

后续继续拆 `logic.js` 时，应按职责迁出到：

```text
core/domain/                         纯数学、几何、lighting/shadow 规则
application/render/                  交互流程、命中结果组装、渲染流程编排
presentation/render/renderer/        Canvas 绘制
presentation/render/diagnostics/     shadow/render 诊断与日志
presentation/render/interaction/     鼠标命中、hover、selection glue
```

验证命令：

```bash
node tests/render-logic-boundary.test.js
node scripts/check_render_logic_boundary.js
```



## P11a-1：Render Logic Interaction Boundary

P11a-1 新增：

```text
src/presentation/render/interaction/render-logic-interaction-boundary.js
```

边界规则：

1. `render-logic-interaction-boundary.js` 负责 render logic 对主编辑器 controller、runtime editor state、view-rotation core 和 projection config 的边界读取。
2. `logic.js` 只保留 thin wrapper，不再直接调用主 controller 的 view-rotation / animation API。
3. 该 owner 不允许承担 Canvas 绘制、DOM mutation、localStorage/sessionStorage、fetch 或 image loading。
4. `render-logic-interaction-boundary.js` 必须在 `logic.js` 前加载。
5. `iso` / `screenToFloor` 暂留 `logic.js`，后续 P11a-2 再按 projection / hit-test owner 迁移。

验证命令：

```bash
node tests/render-logic-interaction-boundary.test.js
node scripts/check_render_logic_interaction_boundary.js
```

## P9e：Editor / UI Boundary Owner

P9e 新增两个 owner：

```text
src/presentation/ui/ui-boundary.js
src/presentation/editor/diagnostics/editor-v18-diagnostics.js
```

边界规则：

1. `ui-boundary.js` 负责 UI 侧 service/controller lookup、controller dispatch fallback、editor handoff 访问和 P1b UI boundary logging。
2. `ui.js` 继续负责 DOM 同步和 UI 事件绑定，不应重新定义 `getUiMainController`、`uiDispatchControllerCommand` 等 boundary 函数。
3. `editor-v18-diagnostics.js` 负责 `START_V18_ONLY.html` 编辑器健康检查 reporter。
4. `editor-unified-v18.js` 继续负责编辑器交互和画布行为，但不应直接持有 `__editorHealthCheck` owner。
5. 修改相关文件后必须运行：

```bash
node tests/editor-ui-boundary.test.js
node scripts/check_editor_ui_boundary.js
```

## P10：Final Hygiene Freeze / 统一守卫入口

P10 后，结构性修改的统一检查入口为：

```bash
node scripts/check_all_guardrails.js
```

该入口聚合以下边界检查：根目录卫生、主路径引用、render extracted symbols、render builder/cache/frame assembler、render order、Canvas draw backend、render diagnostics、state legacy bridge、controller/shell、render logic、editor/UI，以及 final hygiene freeze。

最终冻结相关文件：

```text
scripts/check_all_guardrails.js
scripts/check_final_hygiene_freeze.js
scripts/report_large_nodes.js
tests/final-hygiene-freeze.test.js
docs/P10_FINAL_HYGIENE_FREEZE.zh-CN.md
docs/REMAINING_LARGE_NODES.zh-CN.md
```

剩余大节点记录在：

```text
docs/REMAINING_LARGE_NODES.zh-CN.md
```

当前仍需谨慎处理的代表性文件包括：

```text
src/presentation/render/render.js
src/application/controllers/app-controllers.js
src/presentation/render/logic.js
src/presentation/editor/editor-unified-v18.js
src/infrastructure/legacy/state.js
src/presentation/render/renderer/canvas2d-renderer.js
src/presentation/ui/ui.js
```

这些文件不是新的默认堆代码位置。若后续要修改，应优先抽出小 owner，并保留 thin wrapper；不要把已经迁出的职责重新塞回这些大文件。

## P11a-2：Render Hit-Test / Projection Boundary

P11a-2 新增：

```text
src/presentation/render/interaction/render-hit-test.js
```

职责划分：

1. `render-hit-test.js` 负责 render-facing 的 `worldToScreen`、`screenToFloor` 和 floor screen bounds 投影辅助。
2. `src/presentation/render/logic.js` 可以继续保留兼容函数名 `iso`、`screenToFloor`、`computeFloorScreenBounds`，但实现必须只是 thin wrapper。
3. `logic.js` 不再直接实现 `worldToScreenWithViewRotation` / `screenToWorldWithViewRotation` 分支，也不再直接维护 isometric fallback 投影公式。
4. `render-hit-test.js` 属于 `presentation/render/interaction`，可接收 camera/settings/view-rotation config 注入，但不能访问 Canvas、DOM mutation、storage、fetch、Image、scene/prefab mutation。
5. 加载顺序必须是：`render-logic-interaction-boundary.js` → `render-hit-test.js` → `logic.js`。

检查命令：

```bash
node tests/render-hit-test-boundary.test.js
node scripts/check_render_hit_test_boundary.js
node scripts/check_all_guardrails.js
```


## P11a-3：Render Preview / Selection Interaction Boundary

P11a-3 新增：

```text
src/presentation/render/interaction/render-preview-interaction-controller.js
scripts/check_render_preview_interaction_boundary.js
tests/render-preview-interaction-boundary.test.js
docs/P11A3_RENDER_PREVIEW_INTERACTION_BOUNDARY.zh-CN.md
```

职责边界：

```text
src/presentation/render/interaction/render-preview-interaction-controller.js
  负责 preview update、delete hover box picking、screen face/box picking 的 presentation interaction flow。

src/presentation/render/render.js
  只保留 updatePreview / pickBoxAtScreen / pickFaceAtScreen 的 thin wrapper 和依赖注入。
```

禁止：

```text
不要把完整 updatePreview 实现重新写回 render.js。
不要让 preview interaction controller 直接访问 DOM、Canvas、localStorage、fetch 或 scene/prefab 持久化。
```
