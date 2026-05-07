# AGENTS.md

> 本文件是本项目后续开发的**统一工程约束文档**。  
> 任何 AI 或开发者在修改代码、增加功能、调整结构之前，都应先阅读本文件。  
> 本文件优先于旧阶段性说明；后续开发以这里的约束为准。

---

## 1. 项目定位

这是一个**单客户端本地应用项目**，不是传统意义上的前后端分离项目。

项目主体是：

- 纯 HTML / CSS / JavaScript 的客户端程序
- 一个 Python 本地辅助服务（用于文件读写、资源扫描、日志写入、本地 bridge 等宿主能力）

必须明确：

- `server/` 不是业务后端，不是联机服务器，不是独立产品后端
- 它属于本项目运行所需的**本地宿主 / 基础设施 / 平台适配层**
- 因此，本项目整体仍应按**单客户端架构**理解，而不是 Web 前后端架构理解

---

## 2. 后续开发的三个核心目标

后续所有开发，都必须围绕下面三个目标进行：

### 目标 1：解耦
要持续降低以下内容之间的耦合：

- UI / 输入 / 渲染
- 应用编排
- 核心状态与领域规则
- 平台能力 / 文件读写 / 本地 bridge / 日志 / 兼容层

要求是：

- 不要让一个文件同时承担太多不同职责
- 不要让改一个地方牵动一大片
- 不要把已经抽离的职责重新塞回旧的大文件里
- 不要让 global / compat / fallback 继续主导正常主路径

### 目标 2：可维护
后续代码必须更容易维护，而不是暂时能跑。

要求是：

- 功能入口清楚
- 模块职责清楚
- 新路径与旧路径可区分
- replay / self-check / boundary audit / acceptance summary 尽量保持可用
- 出问题时能较快判断落在哪一层、哪条路径、哪个模块

### 目标 3：可迁移
后续开发必须继续服务于迁移性，而不是继续把逻辑绑定死在当前壳层。

要求是：

- 表现层尽量依赖壳层
- 应用层尽量只做编排
- 核心层尽量不依赖 DOM / window / 本地存储 / 平台 API
- 基础设施层承接平台能力与兼容逻辑
- 新功能优先放到未来可迁移的位置，而不是图省事塞进全局脚本

---

## 3. 目标架构：四层结构

本项目后续开发统一按以下四层理解。

### 第 1 层：presentation（表现层 / 交互层）
负责：

- UI
- 输入
- 渲染
- 动画表现
- 面板
- 事件绑定
- DOM 对象 / 节点树 / 壳层对象

这一层可以依赖具体壳层，但不应承担核心业务规则。

**允许：**

- 操作 DOM
- 绑定按钮、面板、快捷键
- 组织显示与交互反馈
- 调用 application 层入口

**禁止：**

- 直接实现核心领域规则
- 直接持有复杂业务流程
- 直接实现文件读写 / 资源扫描 / 本地 bridge 逻辑
- 直接把 global fallback 当成主路径

---

### 第 2 层：application（应用层 / 编排层）
负责：

- 响应用户动作
- 组织业务流程
- 协调状态变化
- 调用核心层与基础设施层能力
- 将“输入事件”翻译为“业务动作”

这一层不应直接操作大量 DOM 细节，也不应直接绑定平台 API / 文件 IO / 网络底层细节。

**允许：**

- 编排放置、保存、加载、切换模式、导入素材、进入编辑器等流程
- 调用 `state.*`、`core.*`、`infrastructure.*`
- 做最小必要的路由、流程协调、边界日志

**禁止：**

- 直接操作大量 UI 细节
- 直接把 `window.*`、旧入口函数、legacy global 当作正常主路径
- 直接承担平台读写实现

---

### 第 3 层：core（核心层）
负责：

- 世界规则
- placement 判定
- scene graph 规则
- 状态模型
- prefab / instance 规则
- 纯数据变换
- 核心接口协议

这一层必须尽量纯。

**必须尽量避免依赖：**

- DOM
- `window`
- 具体渲染壳层
- 具体平台 API
- 具体存储实现
- 文件系统、网络、`localStorage` 等直接实现

**允许：**

- 纯规则
- 纯状态 owner / state model
- 与外部通过清晰 API / adapter / reader 交互

**禁止：**

- 在核心主路径中直接做壳层装配
- 在核心主路径中直接做 compat global 导出
- 在核心主路径中直接做日志副作用
- 在核心主路径中直接承担平台桥接

---

### 第 4 层：infrastructure（基础设施 / 平台适配 / 兼容层）
负责：

- 文件读写
- 网络实现（如有）
- 资源加载
- 本地存储
- 平台 API
- 本地 bridge
- 日志与审计
- legacy 兼容层
- 临时桥接与迁移兼容代码

这一层可以接脏东西，但不应反过来承担核心业务规则。

**必须明确：**

- `server/` 属于这一层
- Python 本地服务属于这一层
- 各类 bootstrap / bindings / local bridge / self-check 写盘逻辑属于这一层

---

## 4. 当前工程理解：不是前后端分离，而是单客户端 + 本地宿主

后续任何 AI 不要再把本项目理解成：

- `src/` = 前端
- `server/` = 后端

这种理解是错误的。

更准确的理解是：

- `src/`：客户端主程序代码，内部再按四层划分
- `server/`：本地宿主 / 本地服务 / 平台适配能力
- 整个项目本质上仍然是**一个单客户端应用**

因此：

- 不要按互联网产品前后端分工来重构
- 不要把业务逻辑往 `server/` 塞成服务端业务
- 不要为了像前后端而重新拆目录或改通信方式

---

## 5. 根目录与主要入口

根目录面向人类使用者，必须保持简洁。

### 主要入口

- `index.html`：主程序页面入口
- `START_V18_ONLY.html`：编辑器页面入口
- `start.bat`：启动主程序
- `start_editor.bat`：启动编辑器
- `server/local_server.py`：本地宿主服务
- `AGENTS.md`：本项目后续开发统一工程约束

### 主要目录

- `src/`：项目主源码
- `assets/`：资源
- `styles/`：样式
- `server/`：本地宿主 / 平台适配 / 辅助服务
- `config/`：配置
- `logs/`：日志与自检输出
- `docs/`：补充文档

---

## 6. 后续开发时的硬约束

### 6.1 一次只改一个主题
每一轮修改只允许有一个明确主题，例如：

- 一个 application 子闭环
- 一个 core/state 边界
- 一个 infrastructure 写盘链
- 一个 feature 的四层接入

禁止在一次修改中顺手大范围改多个主题。

### 6.2 新功能也必须按四层放置
任何新增功能，先判断它属于哪一层，再落代码。

例如：

- UI 按钮、面板、显示反馈 → presentation
- 点击按钮后触发什么流程 → application
- 放置规则、状态模型、纯规则运算 → core
- 文件、桥接、资源、日志、兼容 → infrastructure

### 6.3 不允许回填旧大文件
不要把已经抽出去的职责重新塞回：

- `app.js`
- `ui.js`
- `render.js`
- `logic.js`
- 各类 legacy state 大文件

如果职责已经有独立模块承接，优先改独立模块。

### 6.4 不允许用 global / compat / fallback 当主路径
可以保留 compat export 和 residual fallback，前提是：

- 只是兼容
- 不主导正常路径
- 有明确边界
- 有日志和证据可区分新旧路径

### 6.5 不要为更现代而重写
本项目不追求：

- 引入 npm
- 引入 bundler
- 改成 ES module 全量架构
- 改成前后端分离产品结构
- 为了先进而重写一套新框架

默认原则是：

- 小步修改
- 行为不变优先
- 渐进收口
- 证据可验收

---

## 7. 对脚本加载、路径和协议的要求

### 7.1 不要随意大改脚本加载顺序
本项目依赖多个 `<script>` 按顺序加载。  
修改 `index.html` 或 `START_V18_ONLY.html` 时：

- 只做最小必要调整
- 不要无根据地重排脚本顺序
- 新增 bootstrap / bindings 时必须说明为什么插在该位置

### 7.2 不要随意改数据协议
没有明确授权时，禁止随意改：

- prefab 数据结构
- scene 数据结构
- API 路径
- 关键字段名
- 历史回放依赖的日志结构

### 7.3 不要引入路径回归
凡是移动文件、重命名文件、调整目录结构，必须同步检查：

- HTML 的 `script` / `link`
- bat 启动脚本
- Python 本地服务路径
- 日志输出路径
- 配置路径

---

## 8. 对新功能开发的具体要求

以后 AI 给本项目加功能时，必须遵守下面流程：

### 第一步：先判断层级归属
必须先回答：

1. 这个功能属于哪一层？
2. 它的主流程在哪一层？
3. 它需要调用哪些已有模块？
4. 它会不会把 compat / global 重新带回主路径？

### 第二步：尽量走现有边界
优先复用已有：

- `state.*`
- `core.*`
- `services.*`
- `controllers.*`
- `workflow.*`
- `boundary audit / acceptance / self-check`

不要绕开现有边界另开全局捷径。

### 第三步：改完必须给出最小验收
新增功能修改后，必须说明：

- 改了哪些文件
- 每个文件为什么改
- 功能主路径怎么走
- 最小验证步骤是什么
- 是否影响现有 replay / acceptance / boundary logs

---

## 9. 当前默认开发策略

当前已经不再适合继续大拆架构。  
后续默认策略应是：

1. 开发新功能
2. 新功能按四层放置
3. 边开发边守边界
4. 发现新功能把结构带歪时，再做小修正
5. 不再轻易开大重构轮

也就是说，项目当前状态下：

> **以功能开发为主，以边界守护为辅。**

---

## 10. 修改后至少要检查什么

每次改动后，至少验证与当前主题直接相关的最小路径。

### 通用最小检查
- 主程序可打开
- 编辑器可打开
- 无新的启动期 `ReferenceError` / `TypeError`
- 相关日志能落盘

### 如果改到 placement / scene / prefab
- 能正常放置
- 能正常拖拽 / 删除
- scene 保存 / 加载不回归
- prefab 相关流程不回归

### 如果改到 state / boundary / summary
- 对应 boundary 文件能落盘
- acceptance summary 字段可见
- 新旧路径能区分

### 如果是新增功能
- 功能主路径可用
- 没有把 global / compat 重新带回主路径
- 最小验收步骤可复现

---

## 11. AI 输出要求

任何 AI 在修改本项目时，输出中至少必须说明：

1. 修改了哪些文件
2. 每个文件属于哪一层
3. 解决了什么问题
4. 哪些路径仍是遗留 / residual fallback
5. 需要人工验证的最小步骤
6. 是否影响现有 replay / acceptance / summary / boundary logs

如果做不到这一点，说明修改不够可控。

---

## 12. 最重要的原则

> **先判断职责归属，再动代码。**  
> **先保证主路径干净，再考虑兼容残留。**  
> **先让证据落盘，再声称修改完成。**

如果一个功能已经有明确层级归属，就不要回到旧位置乱改。  
如果一个兼容路径仍然存在，也不要默认它就是主路径。  
如果 logs 里没有直接证据，就不要声称已经完成。

---

## 13. 给后续 AI 的一句话

> 这是一个**单客户端项目**，不是传统前后端分离项目。  
> 后续开发必须按 **presentation / application / core / infrastructure** 四层进行，始终围绕 **解耦、可维护、可迁移** 三个目标推进；新增功能优先按边界落位，而不是继续制造新的 global / compat / 大文件混合逻辑。

---

## 14. P2b 四层实质归位硬约束

本项目已经进入 P2b 四层实质归位阶段。后续 AI 或开发者在修改前必须额外遵守：

1. 根目录下的 `app.js`、`app-shell.js`、`state.js`、`lighting-editor.js` 是 fail-fast deprecated guard，不是可修改主路径。
2. `src/` 顶层只能保留 `presentation/`、`application/`、`core/`、`infrastructure/` 四个目录。
3. `src/infrastructure/legacy/top-src/` 不允许重新出现。不能通过把旧源码整体搬进 legacy 来代替职责划分。
4. 如果一个旧文件或大文件包含跨层职责，必须按职责拆分：纯规则进入 `core`，流程编排进入 `application`，DOM/Canvas/动画表现进入 `presentation`，存储/日志/API/兼容桥接进入 `infrastructure`。
5. 新功能必须优先进入四层 canonical owner：`src/presentation/`、`src/application/`、`src/core/`、`src/infrastructure/`；不得在 `src/` 顶层新增文件或目录。
6. 纯几何/命中/包围盒/占用表构建类工具优先进入 `src/core/domain/spatial-geometry-core.js` 或同类 core/domain 文件，不要继续塞回 `src/presentation/render/render.js`。
7. 每轮修改后至少运行：

```bash
node scripts/check_project_hygiene.js
node scripts/check_main_path_refs.js
```

这两个检查通过，只说明工程卫生和主路径引用没有明显回退；不等同于功能验收通过。


---

## 15. P3 Habbo placement core 约束

P3 已将 Habbo imported sprite/proxy 的放置偏移、pixel/cell shift、room origin baseline、layer local box 等纯计算迁入：

```text
src/core/domain/habbo-placement-core.js
```

后续修改规则：

1. 这类纯计算继续归 `core/domain`，不要重新塞回 `src/presentation/render/render.js`。
2. `render.js` 可以保留薄包装函数，但包装函数只能读取渲染上下文参数并调用 core API。
3. Canvas、Image、composite cache、drawImage、blend mode 等仍属于 `presentation/render`，不得搬入 core。
4. 修改脚本加载顺序时，必须保证 `habbo-placement-core.js` 在 `render.js` 之前加载。
5. 修改后至少运行：

```bash
node tests/habbo-placement-core.test.js
node scripts/check_main_path_refs.js
node scripts/check_project_hygiene.js
```


## P4 isometric face core rule

1. Face mapping, semantic face normals, voxel face world polygons, face neighbor deltas, and static-world face merge coordinates are owned by `src/core/domain/isometric-face-core.js`.
2. `src/presentation/render/render.js` may keep thin wrappers for compatibility, but it must not reimplement these pure face rules.
3. `src/core/domain/item-facing-core.js` must load before `src/core/domain/isometric-face-core.js`, and both must load before `src/presentation/render/render.js`.
4. When modifying face/visibility/order behavior, first decide whether the change is pure domain math. If yes, place it in `core/domain`; presentation code should only draw.
5. Required verification after touching this boundary:

```bash
node tests/isometric-face-core.test.js
node scripts/check_main_path_refs.js
node scripts/check_project_hygiene.js
```

## P5 terrain render core rule

1. Terrain face merge signatures, terrain sort-band keys, side-edge visibility signatures, side-step break signatures, merge-UV world-point conversion, terrain top-boundary segment construction, and merged voxel-face world geometry are owned by `src/core/domain/terrain-render-core.js`.
2. `src/presentation/render/render.js` may keep thin wrappers for compatibility, but it must not reimplement these pure terrain render rules.
3. `terrain-render-core.js` must load after the lower-level terrain / face core files it depends on and before `src/presentation/render/render.js`.
4. Canvas drawing, pattern creation, fill/stroke application, image caches, and debug overlays remain in `presentation/render`; they must not be moved into core.
5. Required verification after touching this boundary:

```bash
node tests/terrain-render-core.test.js
node scripts/check_render_extracted_symbols.js
node scripts/check_main_path_refs.js
node scripts/check_project_hygiene.js
```

## P6a Static World Renderable Builder Boundary

`buildStaticWorldChunkRenderables` is no longer owned by `src/presentation/render/render.js`.

Canonical owner:

```text
src/application/render/static-world-renderable-builder.js
```

Rules:

- `application/render/static-world-renderable-builder.js` owns the flow from static world chunk data to renderable packet descriptors.
- `presentation/render/render.js` may provide presentation hooks and call the builder through a thin wrapper only.
- The builder must not call `ctx.*`, `canvas`, `document`, `Image`, `localStorage`, `fetch`, or server/storage APIs.
- The builder receives render-specific hooks by explicit dependency injection from `render.js`.
- Do not move Canvas drawing, image cache, pattern fill, camera transform, or frame pipeline logic into `application/render`.
- After modifying this boundary, run:

```bash
node tests/static-world-renderable-builder.test.js
node scripts/check_render_builder_boundary.js
node scripts/check_render_extracted_symbols.js
node scripts/check_main_path_refs.js
node scripts/check_project_hygiene.js
```

## P6b Static World Render Cache Coordinator Boundary

`rebuildStaticBoxRenderCacheIfNeeded` is no longer allowed to own the full static-world cache rebuild flow inside `src/presentation/render/render.js`.

Canonical owner:

```text
src/application/render/static-world-render-cache-coordinator.js
```

Rules:

- `application/render/static-world-render-cache-coordinator.js` owns static-world cache rebuild orchestration: scene sync, chunk-cache collection, rebuild invalidation reason, surface stats, and cache payload updates.
- `presentation/render/render.js` may only provide `requireStaticWorldRenderCacheCoordinatorForRender`, `createStaticWorldRenderCacheCoordinatorDepsForRender`, and a thin `rebuildStaticBoxRenderCacheIfNeeded(...)` wrapper.
- The coordinator receives render-specific hooks through dependency injection and must not call `ctx.*`, `document.*`, `new Image`, `localStorage`, `fetch`, or server/storage APIs.
- The coordinator must load after `static-world-renderable-builder.js` and before `presentation/render/render.js`.
- Do not move Canvas drawing, image caches, camera transform, frame pipeline, or renderer backend logic into `application/render`.
- After modifying this boundary, run:

```bash
node tests/static-world-render-cache-coordinator.test.js
node scripts/check_render_cache_boundary.js
node tests/static-world-renderable-builder.test.js
node scripts/check_render_builder_boundary.js
node scripts/check_main_path_refs.js
node scripts/check_project_hygiene.js
```

## P6c Main Frame Renderable Assembler Boundary

`buildRenderables` and `buildMainFrameRenderables` are no longer allowed to own the full main-frame renderable assembly flow inside `src/presentation/render/render.js`.

Canonical owner:

```text
src/application/render/main-frame-renderable-assembler.js
```

Rules:

- `application/render/main-frame-renderable-assembler.js` owns the flow that assembles static renderables, dynamic object renderables, actor/player renderables, replacement renderables, frame diagnostics, and final renderable order.
- `presentation/render/render.js` may only provide `requireMainFrameRenderableAssemblerForRender`, a thin `buildRenderables()` wrapper, and a thin `buildMainFrameRenderables()` wrapper.
- The assembler must load after `static-world-render-cache-coordinator.js` and before `presentation/render/render.js`.
- The assembler must not call `ctx.*`, `document.*`, `new Image`, `drawImage`, `fetch`, or renderer backend APIs directly.
- A small transitional diagnostic read from `localStorage` may remain until diagnostics are centralized, but it must not become storage/business logic.
- Do not move Canvas drawing, camera transform execution, frame pipeline execution, or renderer backend logic into `application/render`.
- After modifying this boundary, run:

```bash
node tests/main-frame-renderable-assembler.test.js
node scripts/check_frame_assembler_boundary.js
node tests/static-world-render-cache-coordinator.test.js
node scripts/check_render_cache_boundary.js
node tests/static-world-renderable-builder.test.js
node scripts/check_render_builder_boundary.js
node scripts/check_main_path_refs.js
node scripts/check_project_hygiene.js
```

## P7 Render Order Core Boundary

Renderable ordering utilities are no longer owned by `src/presentation/render/render.js`.

Canonical owner:

```text
src/core/domain/render-order-core.js
```

Rules:

1. Renderable order comparison, sorted static/dynamic stream merging, single dynamic renderable binary insertion, and static-order signature generation are owned by `src/core/domain/render-order-core.js`.
2. `src/presentation/render/render.js` may keep thin wrappers for compatibility, but it must not reimplement merge loops, binary insertion loops, or static-order signature bodies.
3. `render-order-core.js` must not access `ctx`, `canvas`, `document`, `Image`, `localStorage`, scene runtime globals, server APIs, or storage APIs.
4. `render-order-core.js` must load before all `application/render` builders/coordinators and before `src/presentation/render/render.js`.
5. `compareRenderablesByDomain` may preserve existing domain comparator compatibility, but fallback order logic must delegate to `render-order-core.js`.

Required checks after touching render order code:

```bash
node tests/render-order-core.test.js
node scripts/check_render_order_boundary.js
node scripts/check_project_hygiene.js
```

## P8 Canvas2D Draw Primitive Boundary

Low-level Canvas2D primitive drawing helpers are no longer owned by `src/presentation/render/render.js`.

Canonical owner:

```text
src/presentation/render/renderer/canvas2d-draw-primitives.js
```

Rules:

1. Polygon drawing, polygon drawing with screen offset, Path2D construction, and simple debug text badge primitives are owned by `canvas2d-draw-primitives.js`.
2. `src/presentation/render/render.js` may keep thin compatibility wrappers such as `drawPoly`, `drawPolyWithOffset`, `drawPolyOn`, `buildPath2DFromPoints`, `buildPath2DFromLoops`, `buildPath2DFromSegments`, `drawTextBadge`, and `drawMultilineBadge`.
3. `canvas2d-draw-primitives.js` may use CanvasRenderingContext2D and Path2D, because it is a presentation renderer backend file.
4. `canvas2d-draw-primitives.js` must not access scene runtime globals, static render cache, localStorage, fetch/server APIs, document, or Image allocation.
5. `canvas2d-draw-primitives.js` must load before `src/presentation/render/render.js`.
6. Do not move renderable assembly, sorting, scene protocol, prefab protocol, camera scope, or application flow into `canvas2d-draw-primitives.js`.

Required checks after touching Canvas2D primitives:

```bash
node tests/canvas2d-draw-primitives.test.js
node scripts/check_canvas_draw_backend_boundary.js
node scripts/check_project_hygiene.js
```

## P8b Canvas2D Shadow Overlay Boundary

Canvas2D clipping/compositing for face shadow overlays is no longer owned by `src/presentation/render/render.js`.

Canonical owner:

```text
src/presentation/render/renderer/canvas2d-shadow-overlays.js
```

Rules:

1. `drawFaceShadowOverlays` and `drawFaceShadowOverlaysNoCamera` implementation bodies are owned by `canvas2d-shadow-overlays.js`.
2. `src/presentation/render/render.js` may keep thin wrappers and the dependency-injection factory `createCanvas2dShadowOverlayDepsForRender`.
3. `canvas2d-shadow-overlays.js` may use CanvasRenderingContext2D clipping/stroking/compositing because it is a presentation renderer backend file.
4. Dependencies that still belong to render.js, lighting, or diagnostics must be injected explicitly. Do not let the shadow overlay backend read scene runtime globals directly.
5. `canvas2d-shadow-overlays.js` must not access scene runtime globals, static render cache, localStorage, fetch/server APIs, document, Image allocation, or renderable assembly.
6. `canvas2d-shadow-overlays.js` must load before `src/presentation/render/render.js`.

Required checks after touching Canvas2D shadow overlays:

```bash
node tests/canvas2d-shadow-overlays.test.js
node scripts/check_canvas_shadow_backend_boundary.js
node scripts/check_project_hygiene.js
```

## P8c Canvas2D Static World Face Draw-Pass Boundary

Canvas2D drawing for static world face packets and cached voxel face packets is no longer owned by `src/presentation/render/render.js`.

Canonical owner:

```text
src/presentation/render/renderer/canvas2d-static-world-face-draw-pass.js
```

Rules:

1. Static world packet projection cache keys, packet projected geometry, terrain top-boundary segment drawing, cached voxel renderable drawing, cached voxel face drawing, and static world face packet drawing are owned by `canvas2d-static-world-face-draw-pass.js`.
2. `src/presentation/render/render.js` may keep thin wrappers and the dependency-injection factory `createCanvas2dStaticWorldFaceDrawPassDepsForRender`.
3. `canvas2d-static-world-face-draw-pass.js` may use CanvasRenderingContext2D and Path2D-related helpers because it is a presentation renderer backend file.
4. Projection, shadow, terrain-pattern, camera, and view-rotation dependencies must be injected explicitly. Do not let this draw pass read scene runtime globals directly.
5. `canvas2d-static-world-face-draw-pass.js` must not access scene runtime globals, static render cache, localStorage, fetch/server APIs, document, Image allocation, renderable assembly, or ordering.
6. `canvas2d-static-world-face-draw-pass.js` must load after `canvas2d-shadow-overlays.js` and before `src/presentation/render/render.js`.

Required checks after touching static-world face draw-pass code:

```bash
node tests/canvas2d-static-world-face-draw-pass.test.js
node scripts/check_canvas_static_world_face_draw_pass_boundary.js
node scripts/check_project_hygiene.js
```

## P8d Canvas2D Floor Layer Draw-Pass Boundary

Chunked floor-layer Canvas drawing and cache composition are no longer owned by `src/presentation/render/render.js`.

Canonical owner:

```text
src/presentation/render/renderer/canvas2d-floor-layer-draw-pass.js
```

Rules:

1. Floor-layer breakdown/profile writing, floor-layer canvas allocation, visible floor chunk selection, floor chunk offscreen rendering, floor outline drawing, floor-layer rebuild, and final floor-layer blit are owned by `canvas2d-floor-layer-draw-pass.js`.
2. `src/presentation/render/render.js` may keep thin wrappers and the dependency-injection factory `createCanvas2dFloorLayerDrawPassDepsForRender`.
3. `canvas2d-floor-layer-draw-pass.js` may use CanvasRenderingContext2D through injected canvases/contexts because it is a presentation renderer backend file.
4. Runtime state that still belongs to render.js or legacy state, such as `floorLayerCanvas`, `floorLayerCtx`, `floorLayerCache`, camera, settings, view rotation, and diagnostics, must be injected explicitly.
5. `canvas2d-floor-layer-draw-pass.js` must not own scene/prefab protocol, application renderable assembly, static world render cache coordination, domain sorting, fetch/server APIs, or Image allocation.
6. `canvas2d-floor-layer-draw-pass.js` must load after `canvas2d-static-world-face-draw-pass.js` and before `src/presentation/render/render.js`.

Required checks after touching floor-layer draw-pass code:

```bash
node tests/canvas2d-floor-layer-draw-pass.test.js
node scripts/check_canvas_floor_layer_boundary.js
node scripts/check_project_hygiene.js
```

## P8e Render Diagnostics Boundary

Throttled render diagnostic/profiling emitters are no longer owned by `src/presentation/render/render.js`.

Canonical owner:

```text
src/presentation/render/diagnostics/render-diagnostics.js
```

Rules:

1. Structured diagnostic emitters such as render-frame summaries, chunk rebuild profiling, static cache invalidation verification, zoom/camera verification, and terrain first-frame diagnostic logs are owned by `render-diagnostics.js`.
2. `src/presentation/render/render.js` may keep thin wrappers and local feature gates such as `isDetailedTerrainProfilingEnabledForRender` when those gates depend on current render settings.
3. Diagnostic throttling state, last-profile state, and `__MAIN_RENDER_DIAGNOSTICS__.getLastStaticBoxCacheProfile` must be provided by the diagnostics module, not by `render.js` globals.
4. `render-diagnostics.js` must not own Canvas drawing, renderable assembly, domain geometry, scene/prefab protocol, localStorage access, fetch/server calls, or application workflow.
5. `render-diagnostics.js` must load before `src/presentation/render/render.js`.

Required checks after touching render diagnostics:

```bash
node tests/render-diagnostics.test.js
node scripts/check_render_diagnostics_boundary.js
node scripts/check_project_hygiene.js
```

## P9a Render Transitional Warning Cleanup

`src/application/render/main-frame-renderable-assembler.js` must not directly read presentation diagnostics state, browser localStorage, or comparator-sort dynamic renderables.

Rules:

1. Actor interaction render-entry diagnostics must go through `noteActorInteractionRenderEntryForRender(...)` instead of directly touching `__actorInteractionOrderDiagState` or localStorage.
2. Dynamic renderables must be sorted through `sortRenderablesByOrderForRender(...)`, which delegates to `src/core/domain/render-order-core.js`.
3. `main-frame-renderable-assembler.js` must not call `dynamicRenderables.sort(compareRenderablesByDomain)` directly.
4. `scripts/check_frame_assembler_boundary.js` and `scripts/check_render_order_boundary.js` treat these as errors, not warnings.

Required checks after touching main-frame assembly, actor-sort diagnostics, or render ordering:

```bash
node tests/main-frame-renderable-assembler.test.js
node tests/render-order-core.test.js
node scripts/check_frame_assembler_boundary.js
node scripts/check_render_order_boundary.js
node scripts/check_project_hygiene.js
```

## P9b State / Legacy Bridge Boundary

State namespace access, legacy placement dispatch, and legacy boot ownership reporting are no longer owned directly by `src/infrastructure/legacy/state.js`.

Canonical bridge owner:

```text
src/infrastructure/legacy/state-bridge.js
```

Rules:

1. `state-bridge.js` owns `getStateNamespacePath`, `getStateApis`, `getPlacementLegacyBridgeState`, `callLegacyPlacement`, and boot ownership reporting for legacy state.
2. `src/infrastructure/legacy/state.js` may keep compatibility wrappers and remaining legacy behavior, but it must delegate namespace access and placement dispatch through `__LEGACY_STATE_BRIDGE__`.
3. New state must not be added to `src/infrastructure/legacy/state.js`. Use `src/core/state/*` for state containers and `src/application/state/state-actions.js` for write orchestration.
4. `state-bridge.js` must not own Canvas drawing, DOM document access, localStorage, fetch/server APIs, or presentation rendering.
5. `state-bridge.js` must load after `runtime-state.js`, `prefab-registry.js`, `scene-session-state.js`, and `state-actions.js`, and before `src/infrastructure/legacy/state.js`.

Required checks after touching state ownership, legacy state, or compatibility bridges:

```bash
node tests/state-legacy-boundary.test.js
node scripts/check_state_legacy_boundary.js
node scripts/check_project_hygiene.js
```

## P9c Controller / Shell Owner Boundary

Controller boundary audit state and shell function-trace diagnostics are no longer owned directly by the large controller/shell files.

Canonical owners:

```text
src/application/controllers/controller-boundary.js
src/presentation/shell/diagnostics/shell-diagnostics.js
```

Rules:

1. `controller-boundary.js` owns controller namespace lookup helpers, controller route audit state, `recordAppBoundaryEvent`, `recordAppBoundaryFallback`, `summarizeAppBoundary`, and `resetAppBoundary`.
2. `src/application/controllers/app-controllers.js` may keep thin wrappers and application action orchestration, but it must not own the controller boundary audit storage.
3. `shell-diagnostics.js` owns function trace configuration, trace installer globals, and `window.__FUNCTION_TRACE_INFO`.
4. `src/presentation/shell/app.js` may install/consume function tracing, but it must not own the full `__functionTraceSpec` table or `installFunctionTrace` implementation.
5. `controller-boundary.js` must load before `app-controllers.js`; `shell-diagnostics.js` must load before `app-shell.js` and `app.js`.

Required checks after touching controller/shell ownership:

```bash
node tests/controller-shell-boundary.test.js
node scripts/check_controller_shell_boundary.js
node scripts/check_project_hygiene.js
```


## P9d Render Logic Duplicate Cleanup

`src/presentation/render/logic.js` must not contain stale duplicate top-level function declarations. Older duplicate lighting/shadow helper declarations were removed in P9d; the remaining declaration for each function name is the browser-visible implementation.

Rules:

1. Do not reintroduce duplicate top-level function declarations in `logic.js`.
2. If a behavior needs an override, create an explicitly named function or move the owner to the appropriate layer instead of redefining the same function name later in the same file.
3. Continue treating `logic.js` as a transitional file; new shadow/math/interaction helpers should move to `core/domain`, `application/render`, or `presentation/render/renderer|diagnostics|interaction` according to responsibility.

Required checks after touching render logic:

```bash
node tests/render-logic-boundary.test.js
node scripts/check_render_logic_boundary.js
node scripts/check_project_hygiene.js
```


## P11a-1 Render Logic Interaction Boundary

Render-logic access to main editor controller view state is now owned by:

```text
src/presentation/render/interaction/render-logic-interaction-boundary.js
```

Rules:

1. `render-logic-interaction-boundary.js` owns render-facing reads of the main controller rotation/animation state, runtime editor rotation fallback, and view projection config assembly.
2. `src/presentation/render/logic.js` may keep thin wrappers such as `isMainEditorViewAnimatingForLogic`, `getSafeMainEditorViewRotationValue`, and `getMainViewProjectionConfig`, but it must not directly call `controller.isMainEditorViewRotating('presentation.render.logic')`, `controller.getMainEditorVisualRotation('presentation.render.logic')`, or `controller.getMainEditorViewRotation('presentation.render.logic')`.
3. This owner must not perform Canvas drawing, DOM mutation, localStorage/sessionStorage access, fetch/server calls, or image loading.
4. `render-logic-interaction-boundary.js` must load before `src/presentation/render/logic.js`.
5. `iso` and `screenToFloor` remain in `logic.js` for now; move them only in the later P11a-2 hit-test/projection step.

Required checks after touching render logic interaction boundary code:

```bash
node tests/render-logic-interaction-boundary.test.js
node scripts/check_render_logic_interaction_boundary.js
node scripts/check_all_guardrails.js
```

## P9e Editor / UI Boundary

UI controller/service access and editor health diagnostics are no longer owned directly by the large UI/editor files.

Canonical owners:

```text
src/presentation/ui/ui-boundary.js
src/presentation/editor/diagnostics/editor-v18-diagnostics.js
```

Rules:

1. `ui-boundary.js` owns UI-side service/controller lookup, controller dispatch fallback, editor handoff service access, and P1b UI boundary logging.
2. `src/presentation/ui/ui.js` may consume those functions and continue to own DOM synchronization and UI event binding, but it must not re-own the P9e boundary accessors.
3. `editor-v18-diagnostics.js` owns editor health-check reporting for `START_V18_ONLY.html`.
4. `src/presentation/editor/editor-unified-v18.js` may consume the diagnostics API, but it must not directly own `__editorHealthCheck` storage.
5. `ui-boundary.js` must load before `ui.js`; `editor-v18-diagnostics.js` must load before `editor-unified-v18.js`.

Required checks after touching UI/editor boundary code:

```bash
node tests/editor-ui-boundary.test.js
node scripts/check_editor_ui_boundary.js
node scripts/check_project_hygiene.js
```

## P10 Final Hygiene Freeze

The project now has a consolidated guardrail entry point:

```bash
node scripts/check_all_guardrails.js
```

Rules:

1. Do not bypass the consolidated guardrail check after structural, owner, script-loading, or large-node changes.
2. Do not recreate old top-level source paths such as `src/render.js`, `src/ui.js`, `src/state.js`, or `src/app.js`.
3. Do not recreate `src/infrastructure/legacy/top-src/` or use legacy source dumps as a substitute for real layer assignment.
4. Do not move extracted `core/domain`, `application/render`, renderer, diagnostics, state-bridge, controller-boundary, UI-boundary, or editor-diagnostics responsibilities back into the large transitional files.
5. If a remaining large node must be touched, prefer extracting a small owner plus a thin wrapper over adding new mixed responsibility code.
6. Use `docs/REMAINING_LARGE_NODES.zh-CN.md` as the current map of remaining high-risk files.
7. `scripts/report_large_nodes.js` is informational. It does not replace boundary checks.

Required final hygiene checks before handoff:

```bash
node tests/final-hygiene-freeze.test.js
node scripts/check_final_hygiene_freeze.js
node scripts/check_all_guardrails.js
```

`check_all_guardrails.js` confirms structural guardrails only. It does not replace real browser interaction testing.

## P11a-2 Render Hit-Test / Projection Boundary

P11a-2 continues the `render/logic.js`收口工作 by moving screen/world projection helpers into a dedicated interaction owner:

```text
src/presentation/render/interaction/render-hit-test.js
```

Rules:

1. `render-hit-test.js` owns render-facing `worldToScreen`, `screenToFloor`, and floor screen bounds projection helpers.
2. `src/presentation/render/logic.js` may keep the public compatibility names `iso`, `screenToFloor`, and `computeFloorScreenBounds`, but their implementation must be thin wrappers over `render-hit-test.js`.
3. Do not reintroduce direct `worldToScreenWithViewRotation` / `screenToWorldWithViewRotation` implementation blocks in `logic.js`.
4. `render-hit-test.js` must not use Canvas, DOM mutation, storage, fetch, Image loading, scene mutation, or prefab mutation.
5. `render-hit-test.js` must load after `render-logic-interaction-boundary.js` and before `src/presentation/render/logic.js`.

Required checks after touching render hit-test/projection code:

```bash
node tests/render-hit-test-boundary.test.js
node scripts/check_render_hit_test_boundary.js
node scripts/check_all_guardrails.js
```


## P11a-3 Render Preview / Selection Interaction Boundary

P11a-3 continues the render interaction cleanup by moving preview update and screen-picking flow out of `src/presentation/render/render.js` into:

```text
src/presentation/render/interaction/render-preview-interaction-controller.js
```

Rules:

1. `updatePreview`, `pickBoxAtScreen`, and `pickFaceAtScreen` must remain thin wrappers in `render.js`.
2. Preview update flow, delete-hover picking, and screen-face picking belong to `render-preview-interaction-controller.js`.
3. The controller must use dependency injection from `render.js`; it must not directly mutate DOM, perform Canvas drawing, access storage, fetch, or persist scene/prefab data.
4. `render-preview-interaction-controller.js` must load before `logic.js` and `render.js`.
5. After touching preview / selection / picking code, run:

```bash
node scripts/check_render_preview_interaction_boundary.js
node tests/render-preview-interaction-boundary.test.js
node scripts/check_all_guardrails.js
```

Do not reintroduce the full preview update implementation into `render.js`.

## P11a-4 Canvas2D Shadow Overlay Projection / Cache Boundary

P11a-4 continues the `render.js` cleanup by moving render-facing shadow overlay projection, no-camera projection, screen-offset cloning, and per-face world-overlay cache out of `src/presentation/render/render.js` into:

```text
src/presentation/render/renderer/canvas2d-shadow-overlay-cache.js
```

Rules:

1. `canvas2d-shadow-overlay-cache.js` owns `worldShadowOverlaysToScreen`, `worldShadowOverlaysToNoCamera`, `shiftShadowOverlays`, `currentShadowOverlaySignature`, `voxelFaceShadowCacheKey`, `cloneWorldShadowOverlays`, `getVoxelFaceShadowWorldOverlays`, `buildVoxelFaceShadowWorldOverlays`, and `buildVoxelFaceShadowOverlays` implementation bodies.
2. `src/presentation/render/render.js` may keep public compatibility wrappers, but those wrappers must delegate to `canvas2d-shadow-overlay-cache.js` through dependency injection.
3. The cache owner belongs to `presentation/render/renderer`; it must not access DOM, storage, fetch/server APIs, image allocation, scene persistence, renderable assembly, or frame ordering.
4. Dependencies still owned by render.js, lighting, or diagnostics must be injected explicitly; do not let the cache owner read scene runtime globals directly.
5. `canvas2d-shadow-overlay-cache.js` must load after `canvas2d-shadow-overlays.js` and before `src/presentation/render/render.js`.

Required checks after touching this boundary:

```bash
node tests/canvas2d-shadow-overlay-cache.test.js
node scripts/check_canvas_shadow_overlay_cache_boundary.js
node scripts/check_all_guardrails.js
```

## P11a-5 Static World Frame Materializer Boundary

P11a-5 continues the `render.js` cleanup by moving static world frame materialization out of `src/presentation/render/render.js` into:

```text
src/presentation/render/renderables/static-world-frame-materializer.js
```

Rules:

1. `static-world-frame-materializer.js` owns `buildStaticVoxelFaceRenderable`, `flattenStaticVoxelRenderable`, `materializeStaticWorldFacePacket`, and `materializeStaticWorldFrameRenderables` implementation bodies.
2. `src/presentation/render/render.js` may keep public compatibility wrappers, but those wrappers must delegate to `static-world-frame-materializer.js` through dependency injection.
3. The materializer belongs to `presentation/render/renderables`; it must not access DOM, storage, fetch/server APIs, image allocation, scene persistence, static cache coordination, frame assembly, Canvas drawing, or renderer backend internals.
4. Dependencies still owned by render.js, domain ordering, projection, shadow projection, and the Canvas2D face draw pass must be injected explicitly.
5. `static-world-frame-materializer.js` must load before `src/presentation/render/render.js`.

Required checks after touching this boundary:

```bash
node tests/static-world-frame-materializer-boundary.test.js
node scripts/check_static_world_frame_materializer_boundary.js
node scripts/check_all_guardrails.js
```


## P11a-6 Static Renderable Color / Lighting Cache Boundary

P11a-6 continues the `render.js` cleanup by moving static renderable color mode, lighting signature, base-face color cache, RGB-to-CSS cache, and cached static fill construction out of `src/presentation/render/render.js` into:

```text
src/presentation/render/renderables/static-renderable-color-cache.js
```

Rules:

1. `static-renderable-color-cache.js` owns `getCachedBaseFaceColorsForRenderable`, `rgbToCssCachedForRenderable`, `getStaticRenderableBuildColorModeForRender`, `isStaticRenderableBuildLightingBypassEnabled`, `isStaticRenderableLightingUiEnabledForBuild`, `isStaticRenderableLightingActiveForBuild`, `getStaticRenderableBuildLightingSignature`, `getStaticRenderableActualColorPathUsed`, `getStaticRenderableFlatDebugFillRgb`, `getStaticRenderableColorScopeSignature`, `ensureStaticRenderableColorCacheScope`, `getStaticRenderableColorCacheMeta`, and `getCachedStaticRenderableFill` implementation bodies.
2. `src/presentation/render/render.js` may keep public compatibility wrappers, but those wrappers must delegate to `static-renderable-color-cache.js` through dependency injection.
3. The color cache owner belongs to `presentation/render/renderables`; it must not access DOM, storage, fetch/server APIs, image allocation, scene persistence, static cache coordination, frame assembly, Canvas drawing, or renderer backend internals.
4. Dependencies still owned by render.js, terrain settings, palette helpers, material readers, and lighting must be injected explicitly.
5. `static-renderable-color-cache.js` must load before `src/presentation/render/render.js`.

Required checks after touching this boundary:

```bash
node tests/static-renderable-color-cache-boundary.test.js
node scripts/check_static_renderable_color_cache_boundary.js
node scripts/check_all_guardrails.js
```

## P11a-7 Render Build Diagnostics Gate Boundary

P11a-7 continues the `render.js` cleanup by moving render-facing detailed static/chunk/color build diagnostic emitter gating out of `src/presentation/render/render.js` into:

```text
src/presentation/render/diagnostics/render-build-diagnostics-gate.js
```

Rules:

1. `render-build-diagnostics-gate.js` owns detailed-terrain-profiling gating for `emitChunkRebuildDetail`, `emitChunkRebuildScopeVerify`, `emitChunkRebuildHotspot`, `emitStaticRenderableBuildDetail`, `emitStaticRenderableBuildHotspot`, `emitStaticRenderableBuildScopeVerify`, `emitColorBuildDetail`, `emitColorBuildHotspot`, `emitBuildColorPathVerify`, `emitColorBuildMissBreakdown`, `emitStep4ColorBuildDetail`, and `emitStep4ColorBuildHotspot`.
2. Ungated build/shadow verification emitters such as `emitChunkRebuildBreakdown`, `emitStep4ColorBuildScopeVerify`, `emitLightingShadowBypassVerify`, and `emitStep4ShadowPathSummary` must also delegate through the gate owner so render-facing build diagnostics have one owner.
3. `src/presentation/render/render.js` may keep public compatibility wrappers, but those wrappers must delegate to `render-build-diagnostics-gate.js` through dependency injection.
4. The gate owner belongs to `presentation/render/diagnostics`; it must not access DOM, Canvas, storage, fetch/server APIs, image allocation, scene persistence, static cache coordination, frame assembly, or renderer backend internals.
5. `render-build-diagnostics-gate.js` must load after `render-diagnostics.js` and before `src/presentation/render/render.js`.

Required checks after touching this boundary:

```bash
node tests/render-build-diagnostics-gate-boundary.test.js
node scripts/check_render_build_diagnostics_gate_boundary.js
node scripts/check_all_guardrails.js
```
## P11b-1 Controller Registry Boundary

P11b-1 starts the `src/application/controllers/app-controllers.js` cleanup by moving controller root composition, namespace binding, and controller entrypoint coverage logging into:

```text
src/application/controllers/controller-registry.js
```

Rules:

1. `controller-registry.js` owns controller root construction, per-controller `dispatch` attachment, namespace binding for `controllers.main`, `controllers.scene`, `controllers.assetLibrary`, `controllers.placement`, `controllers.editorHandoff`, and `controllers.dispatch`, plus entrypoint coverage emitters.
2. `src/application/controllers/app-controllers.js` may keep concrete action orchestration and action group maps, but it must delegate registry wiring through `window.__APP_CONTROLLER_REGISTRY__.registerControllers(...)`.
3. `app-controllers.js` must not reintroduce a local `controllerRoot` composition block or direct `ns.bind('controllers.*', ...)` calls for these controller roots.
4. The registry owner belongs to `application/controllers`; it must not access DOM, Canvas, localStorage, fetch/server APIs, image allocation, storage/file APIs, or presentation renderer internals.
5. `controller-registry.js` must load after `controller-boundary.js` and before `app-controllers.js`.

Required checks after touching this boundary:

```bash
node tests/controller-registry-boundary.test.js
node scripts/check_controller_registry_boundary.js
node scripts/check_all_guardrails.js
```


## P11b-2 Controller Diagnostics Boundary

P11b-2 continues the `src/application/controllers/app-controllers.js` cleanup by moving controller-facing performance timing, structured controller logs, terrain diagnostics, terrain generation profile logs, and scene commit profile logs into:

```text
src/application/controllers/controller-diagnostics.js
```

Rules:

1. `controller-diagnostics.js` owns `isDetailedTerrainProfilingEnabled`, `recordTerrainDiagnostic`, `controllerPerfNowMs`, `emitStructuredControllerLog`, `emitTerrainGenerateProfile`, and `emitSceneCommitProfile` implementation bodies.
2. `src/application/controllers/app-controllers.js` may keep public compatibility wrappers with the existing function names, but those wrappers must delegate to `window.__APP_CONTROLLER_DIAGNOSTICS__`.
3. `app-controllers.js` must not reintroduce direct terrain diagnostic JSON logging, direct `performance.now()` timing, or structured log formatting bodies for these controller diagnostics.
4. The diagnostics owner belongs to `application/controllers`; it must not access DOM, Canvas, localStorage, fetch/server APIs, image allocation, storage/file APIs, or presentation renderer internals.
5. `controller-diagnostics.js` must load after `controller-registry.js` and before `app-controllers.js`.

Required checks after touching this boundary:

```bash
node tests/controller-diagnostics-boundary.test.js
node scripts/check_controller_diagnostics_boundary.js
node scripts/check_all_guardrails.js
```

## P11b-3 Terrain Apply Job Controller Boundary

P11b-3 continues the `src/application/controllers/app-controllers.js` cleanup by moving pending terrain apply job state and batched terrain apply/finalization flow into:

```text
src/application/controllers/terrain-apply-job-controller.js
```

Rules:

1. `terrain-apply-job-controller.js` owns pending terrain apply job state, terrain apply batch size, `beginTerrainApplyJob`, `finalizePendingTerrainApplyJob`, and `tickMainEditorTerrainApply` implementation bodies.
2. `src/application/controllers/app-controllers.js` may keep public compatibility wrappers with the existing function names, but those wrappers must delegate to `window.__APP_TERRAIN_APPLY_JOB_CONTROLLER__` through explicit dependency injection.
3. `app-controllers.js` must not reintroduce `__pendingTerrainApplyJob`, `TERRAIN_APPLY_BATCH_INSTANCE_COUNT`, or the full batched apply/finalization implementation bodies.
4. The apply job owner belongs to `application/controllers`; it must not access DOM, Canvas, localStorage, fetch/server APIs, image allocation, storage/file APIs, or presentation renderer internals. UI refresh hooks must be injected as callbacks rather than called directly by the owner.
5. `terrain-apply-job-controller.js` must load after `controller-diagnostics.js` and before `app-controllers.js`.

Required checks after touching this boundary:

```bash
node tests/terrain-apply-job-controller-boundary.test.js
node scripts/check_terrain_apply_job_controller_boundary.js
node scripts/check_all_guardrails.js
```

## P11b-4 Terrain Generation Diagnostics Boundary

P11b-4 continues the `src/application/controllers/app-controllers.js` cleanup by moving terrain generation diagnostic payload construction and diagnostic-event emission wrappers into:

```text
src/application/controllers/terrain-generation-diagnostics.js
```

Rules:

1. `terrain-generation-diagnostics.js` owns terrain generator params payloads, world-integration summary payloads, logic summary payloads, unification-check payloads, shared render optimization payloads, generator summary forwarding, and generator apply payloads.
2. `src/application/controllers/app-controllers.js` may keep public compatibility wrappers with the existing flow, but those wrappers must delegate to `window.__APP_TERRAIN_GENERATION_DIAGNOSTICS__` through explicit dependency injection.
3. `app-controllers.js` must not reintroduce full `recordTerrainDiagnostic('terrain-generator-params' | 'terrain-world-integration-summary' | 'terrain-placement-unification-check' | 'terrain-debug-face-unification-check' | 'terrain-camera-unification-check' | 'shared-render-optimization-check' | 'terrain-generator-apply', {...})` payload bodies.
4. The diagnostics owner belongs to `application/controllers`; it must not access DOM, Canvas, localStorage, fetch/server APIs, image allocation, storage/file APIs, renderer internals, scene mutation, or terrain apply workflow ownership.
5. `terrain-generation-diagnostics.js` must load after `controller-diagnostics.js` and before `terrain-apply-job-controller.js` / `app-controllers.js`.

Required checks after touching this boundary:

```bash
node tests/terrain-generation-diagnostics-boundary.test.js
node scripts/check_terrain_generation_diagnostics_boundary.js
node scripts/check_all_guardrails.js
```

## P11b-5 Terrain Clear Controller Boundary

P11b-5 continues the `src/application/controllers/app-controllers.js` cleanup by moving terrain clear lifecycle orchestration into:

```text
src/application/controllers/terrain-clear-controller.js
```

Rules:

1. `terrain-clear-controller.js` owns `clearMainEditorTerrain` implementation details: cancelling pending terrain apply jobs, filtering terrain-generated instances, replacing the scene instance list with survivors, resetting terrain runtime/batch state, invalidating terrain render caches, and emitting the `terrain-generator-clear` diagnostic payload.
2. `src/application/controllers/app-controllers.js` may keep the public `clearMainEditorTerrain` compatibility wrapper, but that wrapper must delegate to `window.__APP_TERRAIN_CLEAR_CONTROLLER__` through explicit dependency injection.
3. `app-controllers.js` must not reintroduce the terrain clear implementation body, including `removedLegacy`, `removedTerrainVoxelCount`, `clearTerrainRuntimeModelState(...)`, or inline `terrain-generator-clear` payload construction.
4. The clear owner belongs to `application/controllers`; it must not access DOM, Canvas, localStorage, fetch/server APIs, image allocation, storage/file APIs, renderer internals, or presentation refresh functions directly. UI refresh hooks must be injected as callbacks.
5. `terrain-clear-controller.js` must load after `terrain-apply-job-controller.js` and before `app-controllers.js`.

Required checks after touching this boundary:

```bash
node tests/terrain-clear-controller-boundary.test.js
node scripts/check_terrain_clear_controller_boundary.js
node scripts/check_all_guardrails.js
```

## P11b-6 Terrain Generation Controller Boundary

P11b-6 continues the `src/application/controllers/app-controllers.js` cleanup by moving terrain generation orchestration into:

```text
src/application/controllers/terrain-generation-controller.js
```

Rules:

1. `terrain-generation-controller.js` owns the `generateMainEditorTerrain` implementation body: terrain params normalization, height-map generation, legacy terrain clearing for generation, occupancy/world-integration summary, placement-plan construction, runtime seeding, terrain apply job creation, terrain generation diagnostics forwarding, and queued profile emission.
2. `src/application/controllers/app-controllers.js` may keep the public `generateMainEditorTerrain` compatibility wrapper, but that wrapper must delegate to `window.__APP_TERRAIN_GENERATION_CONTROLLER__` through explicit dependency injection.
3. `app-controllers.js` must not reintroduce the full terrain generation body, including inline `terrainProfileStartAt`, direct `generateHeightMap(...)`, `heightMapToVoxelStacks(...)`, `buildTerrainPlacementPlan(...)`, or inline `beginTerrainApplyJob({...})` construction.
4. The generation owner belongs to `application/controllers`; it must not access DOM, Canvas, localStorage, fetch/server APIs, image allocation, storage/file APIs, renderer internals, or presentation refresh functions directly. UI refresh hooks must be injected as callbacks.
5. `terrain-generation-controller.js` must load after `terrain-clear-controller.js` and before `app-controllers.js`.

Required checks after touching this boundary:

```bash
node tests/terrain-generation-controller-boundary.test.js
node scripts/check_terrain_generation_controller_boundary.js
node scripts/check_all_guardrails.js
```

## P11c-1 Canvas2D Frame Diagnostics Boundary

P11c-1 starts the `src/presentation/render/renderer/canvas2d-renderer.js` cleanup by moving Canvas2D renderer-facing frame diagnostics, profile log formatting, function-breakdown frame helpers, and profile throttling into:

```text
src/presentation/render/renderer/canvas2d-frame-diagnostics.js
```

Rules:

1. `canvas2d-frame-diagnostics.js` owns `emitP5`, `emitRendererProfile`, `safeFixed`, function-breakdown frame setup/read helpers, base-world pass breakdown read helper, simple scalar-object clone helper, detailed-render-profile gating, renderer profile throttling, and draw diagnostic forwarding.
2. `src/presentation/render/renderer/canvas2d-renderer.js` may keep compatibility wrapper functions, but those wrappers must delegate to `window.__CANVAS2D_FRAME_DIAGNOSTICS__` or the `renderer.canvas2dFrameDiagnostics` namespace path.
3. `canvas2d-renderer.js` must not reintroduce inline profile log formatting, inline `__RENDER_FUNCTION_BREAKDOWN__` setup, inline detailed-profile `localStorage` gating, or inline `adapterApi.__profileState` throttling logic.
4. The diagnostics owner belongs to `presentation/render/renderer`; it must not draw to Canvas, allocate canvas/image objects, own render passes, mutate scene/application state, or perform network/file IO.
5. `canvas2d-frame-diagnostics.js` must load after lower-level Canvas2D draw/pass helpers and before `canvas2d-renderer.js`.

Required checks after touching this boundary:

```bash
node tests/canvas2d-frame-diagnostics-boundary.test.js
node scripts/check_canvas2d_frame_diagnostics_boundary.js
node scripts/check_all_guardrails.js
```

## P11c-2 Canvas2D Zoom Preview State Boundary

P11c-2 continues the `src/presentation/render/renderer/canvas2d-renderer.js` cleanup by moving Canvas2D zoom-preview snapshot state, capture/update/clear flow, and fast-path preview drawing into:

```text
src/presentation/render/renderer/canvas2d-zoom-preview-state.js
```

Rules:

1. `canvas2d-zoom-preview-state.js` owns `getZoomPreviewState`, `clearZoomPreviewState`, `captureZoomPreviewFrame`, `updateZoomPreviewState`, `shouldUseZoomPreviewFastPath`, and `drawZoomPreviewFastPath` implementation bodies.
2. `src/presentation/render/renderer/canvas2d-renderer.js` may keep compatibility wrappers and `createCanvas2dZoomPreviewDepsForRenderer`, but wrappers must delegate to `window.__CANVAS2D_ZOOM_PREVIEW_STATE__` or `renderer.canvas2dZoomPreviewState`.
3. `canvas2d-renderer.js` must not reintroduce inline `adapterApi.__zoomPreviewState` allocation, snapshot capture, debounce expiration, fast-path canvas scaling, or `ZOOM-PREVIEW-FASTPATH` profile emission bodies.
4. The zoom preview owner belongs to `presentation/render/renderer`; it may use Canvas2D through explicit dependency injection, but it must not read renderer globals such as `canvas`, `ctx`, `VIEW_W`, `VIEW_H`, or `camera` directly.
5. `canvas2d-zoom-preview-state.js` must load after `canvas2d-frame-diagnostics.js` and before `canvas2d-renderer.js`.

Required checks after touching this boundary:

```bash
node tests/canvas2d-zoom-preview-state-boundary.test.js
node scripts/check_canvas2d_zoom_preview_state_boundary.js
node scripts/check_all_guardrails.js
```

## P11c-3 Canvas2D Static Bitmap Run Cache Boundary

P11c-3 continues the `src/presentation/render/renderer/canvas2d-renderer.js` cleanup by moving Canvas2D static bitmap run cache/reuse/build/draw ownership into:

```text
src/presentation/render/renderer/canvas2d-static-bitmap-run-cache.js
```

Rules:

1. `canvas2d-static-bitmap-run-cache.js` owns static bitmap run cache allocation, reuse-cache allocation, active zoom/deferred-settle reuse decisions, per-run interaction slots, reuse-key/signature construction, static packet run geometry collection, offscreen bitmap construction, bitmap entry drawing, and cache/reuse orchestration.
2. `src/presentation/render/renderer/canvas2d-renderer.js` may keep compatibility wrappers and `createCanvas2dStaticBitmapRunCacheDepsForRenderer`, but wrappers must delegate to `window.__CANVAS2D_STATIC_BITMAP_RUN_CACHE__` or `renderer.canvas2dStaticBitmapRunCache`.
3. `canvas2d-renderer.js` must not reintroduce inline `adapterApi.__staticBitmapCache`, `adapterApi.__staticBitmapReuseCache`, `adapterApi.__staticBitmapInteractionState`, reuse hash/signature construction, static packet run geometry collection, bitmap build, bitmap entry draw, or static bitmap run cache/reuse orchestration bodies.
4. The static bitmap run owner belongs to `presentation/render/renderer`; it may use Canvas2D through explicit dependency injection, but it must not read renderer globals such as `ctx`, `camera`, `settings`, `VIEW_W`, `VIEW_H`, or camera interaction globals directly.
5. Keep this owner as a single-domain file. Do not add unrelated renderer pass logic, diagnostics gates, scene mutation, UI updates, storage/asset logic, or application controller flow to it. If it grows beyond static bitmap run cache/reuse/build/draw, split another owner instead.
6. `canvas2d-static-bitmap-run-cache.js` must load after `canvas2d-zoom-preview-state.js` and before `canvas2d-renderer.js`.

Required checks after touching this boundary:

```bash
node tests/canvas2d-static-bitmap-run-cache-boundary.test.js
node scripts/check_canvas2d_static_bitmap_run_cache_boundary.js
node scripts/check_all_guardrails.js
```

---

## P11c-4 Canvas2D Static Packet Fallback Draw Boundary

P11c-4 continues the `src/presentation/render/renderer/canvas2d-renderer.js` cleanup by moving Canvas2D static packet fallback draw/stats ownership into:

```text
src/presentation/render/renderer/canvas2d-static-packet-fallback-draw.js
```

Rules:

1. `canvas2d-static-packet-fallback-draw.js` owns fallback static packet run draw preparation, per-packet fallback draw execution, fallback cache hit/miss aggregation, and slow-renderable payload construction.
2. `src/presentation/render/renderer/canvas2d-renderer.js` may keep a compatibility wrapper and `createCanvas2dStaticPacketFallbackDrawDepsForRenderer`, but wrappers must delegate to `window.__CANVAS2D_STATIC_PACKET_FALLBACK_DRAW__` or `renderer.canvas2dStaticPacketFallbackDraw`.
3. `canvas2d-renderer.js` must not reintroduce the inline fallback packet loop, static packet geometry/overlay fallback stats aggregation body, or slow-renderable fallback payload construction body.
4. The static packet fallback draw owner belongs to `presentation/render/renderer`; it may call draw callbacks only through explicit dependency injection and must not read renderer globals such as `ctx`, `camera`, `settings`, `VIEW_W`, `VIEW_H`, or direct renderer function globals.
5. Keep this owner as a single-domain file. Do not add static bitmap cache/reuse, zoom preview state, full frame pass orchestration, diagnostics gates, scene mutation, UI updates, storage/asset logic, or application controller flow to it.
6. `canvas2d-static-packet-fallback-draw.js` must load after `canvas2d-static-bitmap-run-cache.js` and before `canvas2d-renderer.js`.

Required checks after touching this boundary:

```bash
node tests/canvas2d-static-packet-fallback-draw-boundary.test.js
node scripts/check_canvas2d_static_packet_fallback_draw_boundary.js
node scripts/check_all_guardrails.js
```

---

## P11c-5 Canvas2D Renderable Order Draw Boundary

P11c-5 continues the `src/presentation/render/renderer/canvas2d-renderer.js` cleanup by moving Canvas2D renderable-order draw loop, dynamic renderable draw-hit diagnostics, canvas timing instrumentation, draw-loop stats aggregation, and frame draw-stat publishing into:

```text
src/presentation/render/renderer/canvas2d-renderable-order-draw.js
```

Rules:

1. `canvas2d-renderable-order-draw.js` owns `drawRenderableOrder` implementation details: adjacent static packet run grouping, dynamic renderable drawing, draw-hit diagnostic payloads, canvas timing hooks, slow-renderable tracking, draw-loop breakdown construction, and frame draw-stat publishing.
2. `src/presentation/render/renderer/canvas2d-renderer.js` may keep compatibility wrappers and `createCanvas2dRenderableOrderDrawDepsForRenderer`, but wrappers must delegate to `window.__CANVAS2D_RENDERABLE_ORDER_DRAW__` or `renderer.canvas2dRenderableOrderDraw`.
3. `canvas2d-renderer.js` must not reintroduce the inline `while (i < order.length)` renderable loop body, canvas timing instrumentation body, inline `DRAW-LOOP-BREAKDOWN` profile construction, inline `main-render-draw-hit` payload body, or frame draw-stat publishing body.
4. The renderable-order owner belongs to `presentation/render/renderer`; it may draw or record diagnostics only through explicit dependency injection and must not read renderer globals such as `ctx`, `camera`, `settings`, `canvas`, `VIEW_W`, or `VIEW_H` directly.
5. Keep this owner as a single-domain file. Do not add static bitmap cache/reuse, zoom preview state, fallback packet draw internals, overlay/HUD passes, scene mutation, UI updates, storage/asset logic, or application controller flow to it.
6. `canvas2d-renderable-order-draw.js` must load after `canvas2d-static-packet-fallback-draw.js` and before `canvas2d-renderer.js`.

Required checks after touching this boundary:

```bash
node tests/canvas2d-renderable-order-draw-boundary.test.js
node scripts/check_canvas2d_renderable_order_draw_boundary.js
node scripts/check_all_guardrails.js
```

---

## P11c-6 Canvas2D Overlay/HUD and Interaction Pipeline Capture Boundaries

P11c-6 continues the `src/presentation/render/renderer/canvas2d-renderer.js` cleanup by moving two Canvas2D renderer adapter subdomains into single-purpose owners:

```text
src/presentation/render/renderer/canvas2d-overlay-hud-pass.js
src/presentation/render/renderer/canvas2d-interaction-pipeline-capture.js
```

Rules:

1. `canvas2d-overlay-hud-pass.js` owns only `drawOverlayPasses` and `drawHudPass` implementation details: overlay step sequencing, lighting overlay calls, HUD text construction, preview HUD text, and shadow-probe HUD text.
2. `canvas2d-interaction-pipeline-capture.js` owns only interaction pipeline capture lifecycle: reset/init, per-pipeline-call accumulation, compact call records, and consume/reset payload conversion.
3. `src/presentation/render/renderer/canvas2d-renderer.js` may keep compatibility wrappers and dependency builders, but wrappers must delegate to `window.__CANVAS2D_OVERLAY_HUD_PASS__` / `renderer.canvas2dOverlayHudPass` and `window.__CANVAS2D_INTERACTION_PIPELINE_CAPTURE__` / `renderer.canvas2dInteractionPipelineCapture`.
4. `canvas2d-renderer.js` must not reintroduce inline overlay/HUD bodies, inline HUD text construction, inline interaction capture field initialization, inline pipeline accumulation loops, or inline interaction capture payload mapping.
5. Both owners belong to `presentation/render/renderer`; they may use Canvas2D or renderer shell callbacks only through explicit dependency injection and must not read renderer globals such as `ctx`, `editor`, `settings`, `debugState`, `canvas`, `camera`, `VIEW_W`, or `VIEW_H` directly.
6. Keep both owners as single-domain files. Do not add static bitmap cache/reuse, zoom preview state, renderable-order draw loops, scene mutation, storage/asset logic, or application controller flow to them.
7. `canvas2d-overlay-hud-pass.js` and `canvas2d-interaction-pipeline-capture.js` must load after `canvas2d-renderable-order-draw.js` and before `canvas2d-renderer.js`.

Required checks after touching this boundary:

```bash
node tests/canvas2d-overlay-hud-pass-boundary.test.js
node tests/canvas2d-interaction-pipeline-capture-boundary.test.js
node scripts/check_canvas2d_overlay_hud_pass_boundary.js
node scripts/check_canvas2d_interaction_pipeline_capture_boundary.js
node scripts/check_all_guardrails.js
```

---

## P11c-7 Canvas2D Frame Pipeline Boundary

P11c-7 continues the `src/presentation/render/renderer/canvas2d-renderer.js` cleanup by moving Canvas2D frame pipeline orchestration into:

```text
src/presentation/render/renderer/canvas2d-frame-pipeline.js
```

Rules:

1. `canvas2d-frame-pipeline.js` owns only `runFramePipeline` orchestration: clear/background timing, zoom-preview fast-path branch, base-world pass timing, frame-plan build timing, renderable-order draw call timing, overlay/HUD pass timing, pipeline breakdown construction, pipeline profile emission, and interaction pipeline call recording.
2. `src/presentation/render/renderer/canvas2d-renderer.js` may keep a compatibility wrapper and `createCanvas2dFramePipelineDepsForRenderer`, but the wrapper must delegate to `window.__CANVAS2D_FRAME_PIPELINE__` or `renderer.canvas2dFramePipeline`.
3. `canvas2d-renderer.js` must not reintroduce inline `runFramePipeline` implementation bodies, inline `CANVAS2D-PIPELINE-BREAKDOWN` / `RENDER-FUNCTION-BREAKDOWN` profile construction, inline base-world/frame-plan/draw-loop/HUD pipeline timing aggregation, or inline interaction pipeline call recording.
4. The frame pipeline owner belongs to `presentation/render/renderer`; it may call renderer pass callbacks only through explicit dependency injection and must not directly read renderer globals such as `ctx`, `canvas`, `camera`, `settings`, `VIEW_W`, `VIEW_H`, or global renderer function symbols.
5. Keep this owner as a single-domain file. Do not add renderable-order draw internals, static bitmap cache/reuse, zoom preview state implementation, overlay/HUD bodies, scene mutation, storage/asset logic, or application controller flow to it.
6. `canvas2d-frame-pipeline.js` must load after `canvas2d-interaction-pipeline-capture.js` and before `canvas2d-renderer.js`.

Required checks after touching this boundary:

```bash
node tests/canvas2d-frame-pipeline-boundary.test.js
node scripts/check_canvas2d_frame_pipeline_boundary.js
node scripts/check_all_guardrails.js
```

---

## P11c-8 Canvas2D Active Render Frame Boundary

P11c-8 continues the `src/presentation/render/renderer/canvas2d-renderer.js` cleanup by moving the active Canvas2D render-frame adapter body into:

```text
src/presentation/render/renderer/canvas2d-active-render-frame.js
```

Rules:

1. `canvas2d-active-render-frame.js` owns only `renderFrame` active-call orchestration: pass/renderables API resolution, active debug hook payload/timing, adapter start/done logs, active wrapper timing, `__lastActiveBreakdown`, and interaction-capture active timing accumulation.
2. `src/presentation/render/renderer/canvas2d-renderer.js` may keep a compatibility wrapper and `createCanvas2dActiveRenderFrameDepsForRenderer`, but the wrapper must delegate to `window.__CANVAS2D_ACTIVE_RENDER_FRAME__` or `renderer.canvas2dActiveRenderFrame`.
3. `canvas2d-renderer.js` must not reintroduce inline `renderFrame` active debug hook bodies, inline active wrapper timing calculation, inline `__lastActiveBreakdown` construction, inline interaction-capture active timing accumulation, or inline adapter start/done log bodies.
4. The active render-frame owner belongs to `presentation/render/renderer`; it may call renderer adapter callbacks only through explicit dependency injection and must not directly read renderer globals such as `ctx`, `canvas`, `debugState`, `VIEW_W`, `VIEW_H`, `boxes`, `lights`, or `assetsReady`.
5. Keep this owner as a single-domain file. Do not add `runFramePipeline` internals, renderable-order draw internals, static bitmap cache/reuse, zoom preview state implementation, overlay/HUD bodies, scene mutation, storage/asset logic, or application controller flow to it.
6. `canvas2d-active-render-frame.js` must load after `canvas2d-frame-pipeline.js` and before `canvas2d-renderer.js`.

Required checks after touching this boundary:

```bash
node tests/canvas2d-active-render-frame-boundary.test.js
node scripts/check_canvas2d_active_render_frame_boundary.js
node scripts/check_all_guardrails.js
```

## P11d-1 Asset Prefab Scan Service Boundary

1. Asset prefab scan state, scan snapshot, managed-id marking, and asset-prefab index scan execution are owned by:

```text
src/infrastructure/assets/asset-prefab-scan-service.js
```

2. `src/infrastructure/assets/asset-management.js` may keep compatibility wrappers for `ensureAssetPrefabScanState`, `getAssetPrefabScanSnapshot`, and `scanAssetPrefabs`, but the wrappers must delegate to `window.__ASSET_PREFAB_SCAN_SERVICE__` through explicit dependency injection.
3. Do not move UI refresh, DOM option rendering, Habbo library browsing, or localStorage persistence into `asset-prefab-scan-service.js`; it must remain a single-purpose infrastructure owner for asset prefab scanning.
4. `asset-prefab-scan-service.js` must load before `asset-management.js`.
5. Required verification after touching this boundary:

```bash
node tests/asset-prefab-scan-service-boundary.test.js
node scripts/check_asset_prefab_scan_service_boundary.js
node scripts/check_main_path_refs.js
node scripts/check_project_hygiene.js
```

---

## P11d-2 Habbo Library Service Boundary

P11d-2 moves Habbo library summary/page/index fetch orchestration into:

```text
src/infrastructure/assets/habbo-library-service.js
```

Rules:

1. `habbo-library-service.js` owns only Habbo library summary/page/index request orchestration, including summary/page in-flight reuse, pending summary polling coordination, query-key page fetches, page item normalization, and library state update payloads.
2. `src/infrastructure/assets/asset-management.js` may keep compatibility wrappers for `fetchHabboLibrarySummary`, `fetchHabboLibraryPage`, and `fetchHabboLibraryIndex`, but wrappers must delegate to `window.__HABBO_LIBRARY_SERVICE__`.
3. Do not add prefab select DOM rendering, custom prefab localStorage persistence, asset prefab scan execution, scene mutation, renderer logic, or controller flow into `habbo-library-service.js`.
4. Keep this owner as an infrastructure asset service. It may call Habbo API adapters and update Habbo library state, but it must not become a UI browser owner.
5. `habbo-library-service.js` must load after `asset-prefab-scan-service.js` and before `asset-management.js`.

Required checks after touching this boundary:

```bash
node tests/habbo-library-service-boundary.test.js
node scripts/check_habbo_library_service_boundary.js
node scripts/check_all_guardrails.js
```

---

## P11d-3 Custom Prefab Storage Boundary

P11d-3 moves custom prefab list/save/load localStorage persistence into:

```text
src/infrastructure/assets/custom-prefab-storage.js
```

Rules:

1. `custom-prefab-storage.js` owns only custom prefab serialization filtering, localStorage save, and localStorage load/import of custom prefab definitions.
2. `src/infrastructure/assets/asset-management.js` may keep compatibility wrappers for `listCustomPrefabs`, `saveCustomPrefabsToLocalStorage`, and `loadCustomPrefabsFromLocalStorage`, but wrappers must delegate to `window.__CUSTOM_PREFAB_STORAGE__`.
3. Do not add Habbo library browsing, asset prefab scan execution, prefab-select DOM refresh, scene storage, renderer logic, or controller flow into `custom-prefab-storage.js`.
4. This owner is allowed to use `localStorage` because it is infrastructure storage/persistence logic, but it must not touch DOM or Canvas.
5. `custom-prefab-storage.js` must load before `asset-management.js`.

Required checks after touching this boundary:

```bash
node tests/custom-prefab-storage-boundary.test.js
node scripts/check_custom_prefab_storage_boundary.js
node scripts/check_all_guardrails.js
```


## P11d-4 Habbo root config service boundary

1. Habbo root config get/set, root input sanitization, and root-config in-flight state orchestration are owned by `src/infrastructure/assets/habbo-root-config-service.js`.
2. `src/infrastructure/assets/asset-management.js` may keep compatibility wrappers, but must delegate `fetchHabboAssetRootConfig`, `setHabboAssetRootConfig`, `sanitizeHabboAssetRootInput`, `getHabboRootConfigInFlightState`, and `awaitHabboRootConfigInFlight` to the root config service.
3. The root config service must stay infrastructure-only; it must not own prefab select DOM refresh, renderer, controller, or scene storage behavior.

## P11d-5 Prefab select refresh presentation boundary

1. Prefab select DOM option refresh is owned by `src/presentation/ui/prefab-select-refresh.js`.
2. `src/infrastructure/assets/asset-management.js` may keep `refreshPrefabSelectOptions` as a compatibility wrapper, but it must not directly build `<option>` nodes or own reentrant refresh guard state.
3. `prefab-select-refresh.js` must stay a presentation/UI owner. It must not own Habbo library fetching, custom prefab persistence, asset scanning, scene mutation, or renderer logic.

## P11d-6 Habbo asset file service boundary

1. Habbo asset relative-path validation and file-buffer fetching are owned by `src/infrastructure/assets/habbo-asset-file-service.js`.
2. `src/infrastructure/assets/asset-management.js` may keep `fetchHabboAssetFileBuffer` as a compatibility wrapper, but it must delegate to `window.__HABBO_ASSET_FILE_SERVICE__` with explicit dependencies.
3. `habbo-asset-file-service.js` must not own Habbo library browsing, prefab placement import, prefab select DOM refresh, scene mutation, renderer logic, or controller flow.

Required checks:

```bash
node tests/habbo-asset-file-service-boundary.test.js
node scripts/check_habbo_asset_file_service_boundary.js
node scripts/check_all_guardrails.js
```

## P11d-7 Habbo placement import service boundary

1. Habbo library item to prefab-placement import handoff is owned by `src/infrastructure/assets/habbo-placement-import-service.js`.
2. `src/infrastructure/assets/asset-management.js` may keep `loadHabboLibraryItemToPlacement` as a compatibility wrapper, but it must delegate to `window.__HABBO_PLACEMENT_IMPORT_SERVICE__` with explicit dependencies.
3. The placement import service may orchestrate asset import handoff through injected callbacks, but it must not directly own UI DOM nodes, Habbo library fetch, custom prefab persistence, renderer logic, scene storage, or controller registry behavior.

Required checks:

```bash
node tests/habbo-placement-import-service-boundary.test.js
node scripts/check_habbo_placement_import_service_boundary.js
node scripts/check_all_guardrails.js
```

## P11d-8 Asset workflow service boundary

1. `services.assetWorkflow` workflow orchestration, counters, recent-event tracking, and workflow result payload construction are owned by `src/infrastructure/assets/asset-workflow-service.js`.
2. `src/infrastructure/assets/asset-management.js` may still bind `services.assetWorkflow`, but the API implementation must be created through `window.__ASSET_WORKFLOW_SERVICE__.createAssetWorkflowApi(...)`.
3. The workflow owner must not own Habbo library request internals, root config request internals, asset scan execution internals, prefab select DOM refresh, renderer logic, scene storage, or controller flow.

Required checks:

```bash
node tests/asset-workflow-service-boundary.test.js
node scripts/check_asset_workflow_service_boundary.js
node scripts/check_all_guardrails.js
```

---

## P11e-1 / P11e-2 scene storage snapshot boundaries

- `src/infrastructure/storage/scene-snapshot-builder.js` owns debug/persistent/default scene snapshot construction.
- `src/infrastructure/storage/scene-snapshot-applier.js` owns applying scene snapshots into runtime/editor state.
- `src/infrastructure/storage/scene-storage.js` must keep `sceneSnapshot`, `persistentSceneSnapshot`, `createDefaultSceneData`, `buildSceneSnapshot`, and `applySceneSnapshot` as compatibility/facade wrappers only.
- Do not move DOM/UI panel refresh logic, renderer logic, or controller workflow logic into these owners.
- Do not put localStorage/server-file/import/export workflow into snapshot builder/applier; those belong to separate scene storage IO owners.
- Keep `scene-snapshot-builder.js` loaded before `scene-snapshot-applier.js`, and both before `scene-storage.js` in `index.html`.

---

## P11f-1 UI camera/render and terrain panel refresh boundaries

- `src/presentation/ui/ui-camera-render-panel.js` owns main camera panel refresh, render panel refresh, render-control transient lock state, and render-control override/effective-setting calculation.
- `src/presentation/ui/ui-terrain-panel-refresh.js` owns terrain algorithm panel visibility, terrain form read/apply, terrain settings read, and terrain summary refresh.
- `src/presentation/ui/ui.js` may keep compatibility wrappers for these functions, but wrappers must delegate to `window.__UI_CAMERA_RENDER_PANEL__` or `window.__UI_TERRAIN_PANEL_REFRESH__`.
- These owners are presentation/UI owners only. They must not own scene storage, asset management, renderer pass internals, controller registry, network fetch, or localStorage persistence.
- Keep both owners loaded before `src/presentation/ui/ui.js` in `index.html`.

Required checks:

```bash
node tests/ui-camera-render-panel-boundary.test.js
node tests/ui-terrain-panel-refresh-boundary.test.js
node scripts/check_ui_camera_render_panel_boundary.js
node scripts/check_ui_terrain_panel_refresh_boundary.js
node scripts/check_all_guardrails.js
```

---

## P11 Final Large Node Audit / Guardrail Freeze

P11 final freezes the first-round large-node cleanup status in:

- `docs/P11_FINAL_LARGE_NODE_AUDIT.zh-CN.md`
- `scripts/check_p11_final_large_node_audit.js`

This final audit does not mean the architecture is fully ideal. It means the first-round cleanup has produced stable owner boundaries for the most urgent renderer, asset, storage, controller, and UI hotspots, and future work should avoid re-filling old large nodes.

Hard rules after this freeze:

- Do not add new logic back into `render.js`, `logic.js`, `app-controllers.js`, `ui.js`, `canvas2d-renderer.js`, `asset-management.js`, or `scene-storage.js` unless the change is a facade/wrapper update.
- New functionality must prefer a single-purpose owner file under the existing four-layer structure.
- New owner files must not become new large mixed-responsibility nodes.
- Any new boundary must update tests or guardrail scripts.

---

## P12a-1 Terrain renderable builder boundary

P12 starts the Render.js De-Hub Round. The first boundary moves terrain runtime/chunk/face renderable construction out of `src/presentation/render/render.js`.

Rules:

- `src/presentation/render/terrain/terrain-renderable-builder.js` owns terrain model helpers used by rendering, terrain chunk render cache, terrain surface source construction, terrain face geometry packets, terrain batched face renderables, and scoped terrain renderable assembly.
- `src/presentation/render/render.js` may keep compatibility wrappers such as `terrainModelHasData`, `buildTerrainChunkBatchedRenderables`, `buildTerrainFaceRenderableItem`, and `buildScopedTerrainRenderables`, but they must delegate to `window.__APP_PRESENTATION_TERRAIN_RENDERABLE_BUILDER__` through explicit dependencies.
- This owner is a presentation/render/terrain owner only. It must not own controller flow, scene storage, asset management, UI panel refresh, Canvas2D backend frame pipeline, or DOM/localStorage/fetch concerns.
- Do not add unrelated sprite, player, placement-preview, render-order, or debug-overlay logic to `terrain-renderable-builder.js`. If those responsibilities need extraction, create their own owners.
- Keep `terrain-renderable-builder.js` loaded before `src/presentation/render/render.js` in `index.html`.

Required checks:

```bash
node tests/terrain-renderable-builder-boundary.test.js
node scripts/check_terrain_renderable_builder_boundary.js
node scripts/check_all_guardrails.js
```

---

## P12a-3 Render frame plan / player move fast-path boundary

P12a-3 continues the Render.js De-Hub Round by moving frame-plan construction, player move fast-path order construction, and render-order diagnostics out of `src/presentation/render/render.js`.

Rules:

- `src/presentation/render/frame/player-move-fast-path.js` owns player move fast-path diagnostic state, eligibility diagnostics, static-order cache state, guarded fast-path order construction, and runtime diagnostics.
- `src/presentation/render/diagnostics/render-order-diagnostics.js` owns render-order/frame-plan diagnostics gating and render-order diagnostic payload emission.
- `src/presentation/render/frame/render-frame-plan-builder.js` owns `buildRendererFramePlan` and `drawRendererFramePlan` orchestration only.
- `src/presentation/render/render.js` must not re-own the implementations of `buildRendererFramePlan`, `tryBuildPlayerMoveFastPathFrameOrderForRender`, `evaluatePlayerMoveFastPathEligibilityForRender`, or `logRenderOrderDiagnostics`.
- These owners must not own sprite rendering, terrain renderable construction, Canvas2D backend drawing, UI panel refresh, controller flow, asset management, or scene storage.
- Keep `player-move-fast-path.js`, `render-order-diagnostics.js`, and `render-frame-plan-builder.js` loaded after terrain renderable builder and before `src/presentation/render/render.js` in `index.html`.
- If any of these owner files grows beyond its focused responsibility, split it by function domain instead of creating a new `utils/helpers/common` bucket.

Required checks:

```bash
node tests/render-frame-plan-boundary.test.js
node scripts/check_render_frame_plan_boundary.js
node scripts/check_all_guardrails.js
```


---

## P12a-4 Sprite / prefab / Habbo / player renderer boundary

P12a-4 continues the Render.js De-Hub Round by moving sprite, prefab, Habbo composite, and player sprite-frame rendering out of `src/presentation/render/render.js`.

Rules:

- `src/presentation/render/sprites/habbo-composite-renderer.js` owns Habbo layer configuration, placement visual shifts, room-origin helpers, layer drawable resolution, Habbo composite caching/building, and Habbo placement pixel/cell shift helpers.
- `src/presentation/render/sprites/prefab-sprite-renderer.js` owns prefab sprite config/image resolution, prefab sprite drawing, Habbo debug overlay, sprite depth split, proxy bounds, and sprite render-sort metadata.
- `src/presentation/render/sprites/player-sprite-frame.js` owns player visual scale, player unified light center, prepared player sprite-frame caching, and player avatar drawing.
- `src/presentation/render/render.js` may keep compatibility wrappers for these functions, but wrappers must delegate to `window.__APP_PRESENTATION_HABBO_COMPOSITE_RENDERER__`, `window.__APP_PRESENTATION_PREFAB_SPRITE_RENDERER__`, or `window.__APP_PRESENTATION_PLAYER_SPRITE_FRAME__`.
- These owners are presentation/render/sprites owners only. They must not own terrain renderable construction, frame-plan ordering, Canvas2D backend frame pipeline, UI panel refresh, controller flow, asset management, or scene storage.
- Keep all sprite owners loaded before `src/presentation/render/render.js` in `index.html`.
- Do not create `render-utils.js`, `sprite-helpers.js`, or similar mixed buckets; if an owner grows beyond its focused responsibility, split by sprite/prefab/Habbo/player domain.

Required checks:

```bash
node tests/sprite-renderer-boundaries.test.js
node scripts/check_sprite_renderer_boundaries.js
node scripts/check_all_guardrails.js
```

---

## P12a-5 Placement preview / projection debug overlay boundary

P12a-5 continues the Render.js De-Hub Round by moving placement preview drawing, debug cuboid face renderable helpers, and projection debug overlays out of `src/presentation/render/render.js`.

Rules:

- `src/presentation/render/preview/placement-preview-renderer.js` owns placement preview drawing, debug five-face preview drawing, debug cuboid face renderable helpers, placed debug face renderables, and placement-preview status labeling.
- `src/presentation/render/debug/projection-debug-overlay.js` owns selected-instance projection debug overlay, item-facing prototype overlay, facing legend drawing, and facing overlay polygon helpers.
- `src/presentation/render/render.js` may keep compatibility wrappers such as `drawPlacementPreview`, `drawDebugFiveFacePlacementPreview`, `buildPlacedDebugInstanceFaceRenderables`, `drawSelectedInstanceProjectionDebug`, and `drawItemFacingPrototypeOverlay`, but they must delegate to the focused owners.
- These owners must not own terrain renderable construction, sprite/Habbo/player rendering, frame-plan ordering, Canvas2D backend frame pipeline, UI panel refresh, controller flow, asset management, or scene storage.
- Keep `placement-preview-renderer.js` and `projection-debug-overlay.js` loaded before `src/presentation/render/render.js` in `index.html`.
- Do not create `render-debug-utils.js`, `preview-helpers.js`, or similar mixed buckets; if an owner grows beyond its focused responsibility, split by placement-preview versus projection-debug domain.

Required checks:

```bash
node tests/placement-preview-debug-overlay-boundaries.test.js
node scripts/check_placement_preview_debug_overlay_boundaries.js
node scripts/check_all_guardrails.js
```

---

## P12b-0 Render dead-code pruning boundary

P12b-0 runs before further Render.js de-hub work. It removes high-confidence unused legacy declarations from `src/presentation/render/render.js` instead of moving stale code into new owners.

Rules:

- Do not reintroduce the removed render.js-only legacy declarations: `projectedBounds`, `buildBoxFaces`, `highestTopAtCell`, `isMainEditorCameraCullingEnabledForRender`, `getMainCameraVisibleBoxesForRender`, `isActorInteractionSingleColumnTallGroup`, `areAllActorInteractionPacketKeysHit`, or `accumulateRenderFunctionTiming`.
- This pruning only applies to stale declarations in `src/presentation/render/render.js`. It does not remove active owners with similar names in `core`, such as `scene-domain-core.js`.
- Future de-hub work must run a dead-code audit first when a candidate function appears to be historical residue. Do not preserve unused code by moving it into new owner files.
- Do not delete compatibility wrappers merely because they have few direct textual references; namespace-bound APIs and guardrail-owned wrappers need explicit verification before removal.

Required checks:

```bash
node tests/render-dead-code-pruning.test.js
node scripts/check_render_dead_code_pruning.js
node scripts/check_all_guardrails.js
```

---

## P12b-1 Instance / actor renderable builder boundary

P12b-1 continues the Render.js De-Hub Round by moving instance render update-mode splitting, visible-instance summary caching, and proxy-box fallback drawing out of `src/presentation/render/render.js`.

Rules:

- `src/presentation/render/instances/instance-renderable-builder.js` owns instance render update-mode normalization, prefab render update-mode selection, dynamic/static instance splitting, visible-instance summary caching, and instance proxy box fallback drawing.
- `src/presentation/render/render.js` must not re-own implementations of `isInstanceDynamicRenderableForFrame`, `buildInstanceRenderUpdateModeIndex`, `getDynamicInstanceSplitForRender`, `getVisibleInstanceSummaryForRender`, or `drawInstanceProxyBoxes`.
- This owner must not own sprite/Habbo/player rendering, terrain renderable construction, render frame planning, placement preview, projection debug overlays, Canvas2D backend drawing, UI panel refresh, controller flow, asset management, or scene storage.
- Keep `instance-renderable-builder.js` loaded before `src/presentation/render/render.js` in `index.html`.
- Do not create `instance-utils.js`, `render-helpers.js`, or similar mixed buckets; if instance rendering grows further, split by update-mode, visibility summary, and proxy fallback domains.

Required checks:

```bash
node tests/instance-renderable-builder-boundary.test.js
node scripts/check_instance_renderable_builder_boundary.js
node scripts/check_all_guardrails.js
```

---

## P12b-2 Projection / camera render-scope boundary

P12b-2 continues the Render.js De-Hub Round by moving main-camera settings, viewport/world-bound projection, camera-culling filters, visibility-count caching, and camera-bounds debug drawing out of `src/presentation/render/render.js`.

Rules:

- `src/presentation/render/projection/render-scope-builder.js` owns main camera render settings accessors, viewport screen bounds, viewport-to-world bounds projection, culling-world bounds expansion, camera-scope caching, visibility-count caching, camera-culling filters, and camera-bounds debug drawing.
- `src/presentation/render/render.js` must not re-own implementations of `getMainCameraRenderScope`, `computeMainEditorViewportWorldBounds`, `filterRenderablesForMainCameraScope`, `filterLightsForMainCameraScope`, `filterBoxesForMainCameraScope`, or `drawMainCameraBoundsDebug`.
- This owner must not own terrain renderable construction, sprite/Habbo/player rendering, instance render update-mode splitting, render frame planning, placement preview, Canvas2D backend drawing, UI panel refresh, controller flow, asset management, or scene storage.
- Keep `render-scope-builder.js` loaded before `src/presentation/render/render.js` in `index.html`.
- Do not create `projection-utils.js`, `camera-helpers.js`, or similar mixed buckets; if projection/camera scope grows further, split by projection math, visibility filtering, and debug drawing domains.

Required checks:

```bash
node tests/render-scope-builder-boundary.test.js
node scripts/check_render_scope_builder_boundary.js
node scripts/check_all_guardrails.js
```

---

## P12b-3 Static Renderable Facade Boundary

`src/presentation/render/renderables/static-renderable-facade.js` owns the static-world renderable builder and static-world render-cache coordinator lookup/dependency glue.

Rules:

- `render.js` must not reimplement `resolveRenderFunctionDependency`, `requireStaticWorldRenderableBuilderForRender`, `createStaticWorldRenderableBuilderDepsForRender`, `buildStaticWorldChunkRenderables`, `requireStaticWorldRenderCacheCoordinatorForRender`, `createStaticWorldRenderCacheCoordinatorDepsForRender`, or `rebuildStaticBoxRenderCacheIfNeeded`.
- The facade owner must stay limited to static renderable build/cache delegation. Do not add terrain renderable construction, sprite drawing, placement preview, frame plan, or projection scope logic to this file.
- `src/presentation/render/renderables/static-renderable-facade.js` must load before `src/presentation/render/render.js`.
- Run `node scripts/check_static_renderable_facade_boundary.js` after touching this boundary.

### P12b-4：Render diagnostics facade boundary

- `src/presentation/render/diagnostics/render-diagnostics-facade.js` owns render.js-facing diagnostics lookup, build-diagnostics gate delegation, frame/cache/zoom diagnostic forwarding, terrain first-frame diagnostics context, and render-function timing/debug breakdown buckets.
- `src/presentation/render/render.js` must not re-own these diagnostics/debug payload functions. It may call the global facade functions for compatibility, but implementation must remain in the diagnostics owner.
- The diagnostics facade must not contain Canvas drawing, terrain/sprite/preview/frame-plan construction, UI DOM, controller flow, asset/storage/file IO, or generic render helpers.
- Boundary checks: `node scripts/check_render_diagnostics_facade_boundary.js` and `node tests/render-diagnostics-facade-boundary.test.js`.


### P12b-5：Actor interaction order diagnostics boundary

- `src/presentation/render/diagnostics/actor-interaction-order-diagnostics.js` owns actor interaction sort diagnostic runtime state, enablement checks, export-channel logging, render-entry/final-order diagnostic payloads, actor diagnostic summarizers, and duplicate diagnostic signature suppression.
- `src/presentation/render/render.js` must not re-own `__actorInteractionOrderDiagState`, actor-sort localStorage flag reads, actor diagnostic payload summarizer bodies, or candidate/replacement/final-order duplicate signature state. It may keep compatibility wrappers that delegate to the diagnostics owner.
- The actor diagnostics owner must stay diagnostics-only. It must not own actor interaction sorting/replacement rules, renderable construction, Canvas drawing, frame-plan assembly, UI DOM, controller flow, asset/storage/file IO, or generic render helpers.
- Boundary checks: `node scripts/check_actor_interaction_order_diagnostics_boundary.js` and `node tests/actor-interaction-order-diagnostics-boundary.test.js`.

### P12b-6：Stable local actor demerge boundary

- `src/presentation/render/interaction/stable-local-demerge.js` owns stable local actor demerge, support-top packet predicates, local demerge cache state, near-player descriptor splitting, residual descriptor re-merge, and stable local demerge result summaries.
- `src/presentation/render/render.js` must not re-own `__stableLocalDemergeCache`, stable-local demerge cache key construction, near-player descriptor classification bodies, residual descriptor merge bodies, or stable local demerge packet construction. It may keep compatibility wrappers that delegate to the interaction owner.
- The stable local demerge owner must stay interaction/sort-domain only. It must not own actor order diagnostics runtime state, Canvas drawing, DOM/UI, controller flow, asset/storage/file IO, generic render helpers, or the full actor replacement pipeline.
- Boundary checks: `node scripts/check_stable_local_demerge_boundary.js` and `node tests/stable-local-demerge-boundary.test.js`.

## P12b-7 Renderable Order Adapter Boundary

P12b-7 starts the static/dynamic occlusion cleanup by moving render-facing sort-meta, comparator, draw-position, and sorted stream merge adapter logic out of `src/presentation/render/render.js` into:

```text
src/presentation/render/renderables/renderable-order-adapter.js
```

Rules:

1. `renderable-order-adapter.js` owns only adapter glue from render-facing callers to pure domain order/view-rotation cores.
2. Pure order algorithms remain in `src/core/domain/render-order-core.js`; pure view-rotation sort meta remains in `src/core/domain/view-rotation-core.js`.
3. Actor replacement, stable local demerge, static-world face descriptor construction, canvas drawing, and scene mutation must not be added to this owner.
4. `render.js` may keep compatibility wrappers, but wrappers must delegate to `requireRenderableOrderAdapterForRender()`.
5. The owner must load before `src/presentation/render/render.js`.

Required checks:

```bash
node tests/renderable-order-adapter-boundary.test.js
node scripts/check_renderable_order_adapter_boundary.js
node tests/render-order-core.test.js
node scripts/check_render_order_boundary.js
```

## P12b-8 Actor Interaction Geometry Boundary

P12b-8 continues actor/static occlusion cleanup by moving actor interaction face-key, group-summary, player sort-meta, no-camera projection, and single-footprint relation geometry out of `src/presentation/render/render.js` into:

```text
src/presentation/render/interaction/actor-interaction-geometry.js
```

Rules:

- `actor-interaction-geometry.js` owns actor interaction geometry only: face keys, group keys, group summaries, player-relative sort meta, projection without camera, and single-footprint player relation classification.
- It must not draw, mutate scene state, emit diagnostics, own replacement packet construction, or own support-top sort override.
- `render.js` must keep only compatibility wrappers for these functions and delegate to `requireActorInteractionGeometryForRender()`.
- The owner must load before `stable-local-demerge.js` and before `render.js`.
- Guardrail: `node scripts/check_actor_interaction_geometry_boundary.js`.


## P12b-9 Actor Interaction Replacement Boundary

P12b-9 completes the actor/static replacement slice of the actor occlusion cleanup by moving candidate face-set generation, replacement eligibility, static packet suppression, replacement renderable construction, and replacement result assembly out of `src/presentation/render/render.js` into:

```text
src/presentation/render/interaction/actor-interaction-replacement.js
```

Rules:

- `actor-interaction-replacement.js` owns replacement candidate/suppression/replacement assembly only.
- It must not own actor interaction geometry, stable-local demerge, support-top sort override, diagnostics runtime state, canvas drawing, scene mutation, DOM, storage, or asset loading.
- `render.js` may keep compatibility wrappers but must delegate replacement logic through `requireActorInteractionReplacementForRender()`.
- Guardrail: `node scripts/check_actor_interaction_replacement_boundary.js`.
- Test: `node tests/actor-interaction-replacement-boundary.test.js`.

## P12b-10 Actor Support-Top Sort Override Boundary

P12b-10 completes the support-top special ordering slice by moving the player support-top sort override out of `src/presentation/render/render.js` into:

```text
src/presentation/render/interaction/actor-support-top-sort-override.js
```

Rules:

- `actor-support-top-sort-override.js` owns only player support-top sort override.
- It must not own actor interaction replacement, stable-local demerge, diagnostics runtime state, canvas drawing, scene mutation, DOM, storage, or asset loading.
- `render.js` may keep a compatibility wrapper but must delegate support-top override through `requireActorSupportTopSortOverrideForRender()`.
- Guardrail: `node scripts/check_actor_support_top_sort_override_boundary.js`.
- Test: `node tests/actor-support-top-sort-override-boundary.test.js`.

---

## P12c-1 / P12c-2 static world descriptor + ordering boundaries

- Static world visible-surface cell to face descriptor construction is owned by `src/application/render/static-world-face-descriptor-builder.js`.
- Static world packet identity and packet ordering are owned by `src/application/render/static-world-packet-ordering.js`.
- `src/application/render/static-world-renderable-builder.js` remains the chunk-level orchestrator and must not re-own large visible face descriptor loops, face tie priority tables, packet ID/faceKey construction, or direct `packets.sort(compareRenderablesByDomain)` logic.
- Both owner files stay in `src/application/render/`; they must not depend on DOM, Canvas, localStorage, Image, fetch, storage, UI, or renderer implementation details.
- Guardrails: `node scripts/check_static_world_face_descriptor_builder_boundary.js` and `node scripts/check_static_world_packet_ordering_boundary.js`.
