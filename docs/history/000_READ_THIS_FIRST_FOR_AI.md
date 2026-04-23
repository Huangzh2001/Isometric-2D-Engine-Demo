CURRENT PHASE: P8X final cleanup / regression / handoff

# 000_READ_THIS_FIRST_FOR_AI.md

> **AI / 自动化代理先读这里，再改代码。**
>
> 详细工程约束见 `AGENTS.md`，详细重构路线见 `docs/PROJECT_REFACTOR_PHASE_PLAN.zh-CN.md`。

## 当前总目标

本项目的最终目标不是简单做“前后端二分”，而是收敛成 **4 层结构**：

1. **Renderer Adapter（渲染适配层）**
   - 只负责 Canvas2D / WebGL / WebGPU / 未来引擎的绘制、屏幕坐标、draw call、shader / blur / glow / alpha compositing、屏幕命中测试。
   - 这一层必须可以替换。
2. **App / UI Controller（应用控制层）**
   - 只负责 DOM 事件、面板状态、按钮行为、编辑模式切换、把用户输入转成标准命令。
3. **Domain Core（领域核心层）**
   - 只负责 instance / prefab / player / light 的领域模型，占地、碰撞、可通行判断、等距空间前后关系、排序 key、支撑关系、场景更新规则、阴影几何基础结果。
   - 这一层必须尽量做到纯函数，不依赖 DOM / canvas / window。
4. **Asset / Scene Service（资源与场景服务层）**
   - 只负责 prefab 扫描、Habbo index、SWF 读取、元数据提取、scene 保存 / 读取、scene 校验、prefab 归一化、缓存与索引。

## 10 个 phase 的主线

- **P0**：基线与结构化日志（当前已接入）
- **P1**：清理重复 / 残留文件，固定唯一真实源码位置
- **P2**：收口全局脚本依赖，建立统一 bootstrap / namespace
- **P3**：状态边界重构（state boundary refactor）
- **P4**：拆 `state.js`，把状态和解析逻辑分开
- **P5**：抽 Domain Core I：占地、碰撞、可通行、放置合法性
- **P6**：抽 Domain Core II：排序、遮挡、前后关系
- **P7**：抽 Domain Core III：阴影几何，不碰最终画法
- **P8 / P9 / P10**：已合并为 **P8X 总收尾阶段**，不再拆成三个小阶段单独推进。

## 当前 phase：P8X

P0～P7 主骨架已经完成；当前项目进入 **P8X：总收尾阶段**，集中处理：

1. 清理一批已冗余但仍安全保留的 compat / fallback 胶水；
2. 维持主链回归可判定日志（Habbo library → import → place；editor → main → rescan/select → place）；
3. 补最终交接文档，明确哪些兼容壳仍故意保留、哪些层已经完成。

### P0 已落地的内容：

- 前端统一结构化日志前缀：`[P0][BOOT]` / `[P0][BOUNDARY]` / `[P0][INVARIANT]` / `[P0][SUMMARY]`
- 主程序入口 `index.html` 接入 P0 logger
- 编辑器入口 `START_V18_ONLY.html` 接入 P0 logger
- 主程序启动阶段会做一轮服务诊断：
  - `/api/health`
  - `/api/scenes/default`
  - `/api/prefabs/index`
  - `/api/habbo/library/summary`
  - `/api/habbo/library/page`
- 后端 `server/local_server.py` 会输出 P0 结构化启动与 API 边界日志

### P1 已落地的内容：

- 根目录重复脚本已 stub 化：`app.js` / `state.js` / `app-shell.js` / `lighting-editor.js`
- 唯一真实源码位置已固定到 `src/` 与 `server/`
- `.bak` 残留文件已移除
- 新增根目录显眼文档：`001_SOURCE_OF_TRUTH.md`
- 主程序 / 编辑器 / 后端会输出 P1 结构化来源日志，明确当前 canonical source 路径与废弃 root stub 状态

## 修改本项目时必须遵守

- 一次只做 **一个 phase**
- 不跨 phase 顺手大改
- 每次都交付 **完整项目**，不要只丢零散 patch
- 每个 phase 都必须配套可判定日志
- 不要在未授权时改 prefab / scene / API 协议
- 不要把渲染算法、领域规则、资源服务再次混回大文件

## 本轮日志验收重点

启动后，应该能在前端或后端日志中直接看到：

- 当前入口到底是 `index.html` 还是 `START_V18_ONLY.html`
- 后端是否启动成功
- 路由注册情况
- scene / prefab / habbo library 是否正常响应
- 当前实例数 / prefab 数 / light 数 / 主要模块可见性


## Backend log location

- Current run log: `logs/server/server-<role>-YYYYMMDD-HHMMSS.log`
- Latest shortcut log: `logs/server/server-<role>-latest.log`
- Default role from `start.bat` is usually `main`; editor launcher may use a different role.


## Current integration patch
- P1b adds editor→main handoff logs, prefab save handoff markers, main-side prefab rescan/selection after returning from editor, and backend benign client-disconnect logging for aborted library-page requests.


## Current progress

- Completed: P0–P7
- Current working step: **P8X**（merged cleanup / regression / handoff）
- Inspect first for current orchestration boundaries:
  - `src/application/controllers/app-controllers.js`
  - `src/infrastructure/assets/asset-management.js`
  - `src/infrastructure/storage/scene-storage.js`
  - `src/presentation/render/renderer/canvas2d-renderer.js`
  - `docs/P8X_FINAL_HANDOFF.zh-CN.md`

## 当前稳定保留的 compat 壳

以下兼容壳当前仍故意保留，优先保障主链稳定，不在总收尾阶段激进移除：

- `saveScene`
- `loadScene`
- `refreshInspectorPanels`
- editor/runtime globals
- `asset-management-ownership-check`
- `legacy-habbo-prefab-repair`
