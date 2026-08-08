CURRENT PHASE: P8X final cleanup / regression / handoff

# Isometric Room Tool

> **AI / 自动化代理：先读根目录 `000_READ_THIS_FIRST_FOR_AI.md`，再读 `001_SOURCE_OF_TRUTH.md`，最后读 `AGENTS.md`。**

\> 对 AI/自动化代理：修改本项目之前，先阅读根目录 `AGENTS.md`。

## Quick start

- Main app: double-click `start.bat`
- Asset editor: double-click `start_editor.bat`

## Root-level files
- `start.bat`: launch the main app
- `start_editor.bat`: launch the prefab editor
- `index.html`: main app page entry
- `START_V18_ONLY.html`: editor page entry (kept for compatibility)

## Main folders
- `src/`: front-end source code
- `assets/`: prefab files, scenes, sample assets
- `styles/`: shared CSS files
- `server/`: local Python server and helper launcher
- `config/`: local configuration files
- `logs/`: runtime log files
- `docs/`: architecture and refactor documentation

## Notes
- The root layout has been cleaned up so that only user-facing entry files remain visible at the top level.
- Server, config, style, and log files have been moved into dedicated folders.
- Existing launchers were updated to preserve behavior.


## Phase P1: source of truth
- Canonical source locations are documented in `001_SOURCE_OF_TRUTH.md`.
- Root-level duplicate JS files are deprecated stubs and must not be edited.


## Backend log location

- Current run log: `logs/server/server-<role>-YYYYMMDD-HHMMSS.log`
- Latest shortcut log: `logs/server/server-<role>-latest.log`
- Default role from `start.bat` is usually `main`; editor launcher may use a different role.


## Current integration patch
- P1b adds editor→main handoff logs, prefab save handoff markers, main-side prefab rescan/selection after returning from editor, and backend benign client-disconnect logging for aborted library-page requests.


## Current progress

- Completed: P0, P1, P1a, P1b, P2-A, P2-B, P2-C
- Completed: P0–P7
- Current working step: **P8X**（合并原 P8 / P9 / P10 的总收尾阶段）
- Final cleanup focus:
  - remove redundant compat / fallback glue where safe
  - keep core regression chains observable in logs
  - update final handoff docs for future AI / developer continuation

## Current architecture state
- Renderer execution is centered on `App.renderer.active` / `src/presentation/render/renderer/canvas2d-renderer.js`.
- Asset / scene orchestration is centered on `App.services.assetWorkflow` and `App.services.sceneWorkflow`.
- UI / app orchestration is centered on `App.controllers.*`.
- Some compat wrappers are intentionally retained for stability: `saveScene`, `loadScene`, `refreshInspectorPanels`, editor/runtime globals, asset ownership check, and legacy Habbo prefab repair.


## 统一素材编辑器

运行 `start_editor.bat`，顶部固定为同一条素材生产流程：

1. **编辑图片**：普通图片、Habbo SWF 和未来导入器都进入统一四方向分层 RGBA 文档；支持可调分辨率像素化、颜色量化和逐像素编辑。
2. **编辑体素**：采用俯视层编辑 + 等距组合预览的双视图；切换“对齐图片”后，可直接调整图片与 voxel、碰撞和占地的关系。
3. **编辑行为**：编辑 Prefab 自带的 `default.lua`、Capabilities、公开 Commands / Events；可同时搜索项目 Prefab 与独立外部素材库中的其他素材，查看其公开接口并点击插入调用代码；支持 Ctrl+Space 轻量补全。行为页下方带隔离 `TestWorld`：可把当前素材和外部素材库中的任意素材放进同一测试场景，使用测试人物验证 State 图片/voxel 切换，并运行 `onClick`、`self:getState/setState`、Prefab Command 调用及少量 Gameplay API 的 Lua Test Runtime v0 子集。完整 Lua VM 与正式 Gameplay Runtime 仍属于后续阶段。
4. **导出**：在独立检查页确认素材信息、四方向图层、voxel、图片对齐与 Behavior，再输出 `hzh-unified-material-v1` 的 `.hzhmat`。图层像素采用 RLE，整包采用 gzip。

编辑器现在使用 `state → facing → layers`：状态栏可新建、重命名、复制、删除和排序状态；单图层与当前方向全部图层可复制到指定状态/方向。每个状态分别保存 artwork、voxel 与四方向图片变换。当前 Habbo importer 仍有把多个 `<animation id>` 暂时映射到 material state 的过渡实现；长期语义必须保持 `State != Animation != Frame`，真正的多帧动画应进入 Animation / Frame 维度。

完整格式说明见 `docs/UNIFIED_MATERIAL_FORMAT.zh-CN.md`。不得为某种素材来源新增平行编辑器。

### 重要：涌现式素材系统目标架构

后续 Material、Component / Capability、Prefab Behavior、Lua Runtime、Gameplay API、事件/消息系统与 Scene Logic 的设计，以 `docs/EMERGENT_ASSET_SYSTEM_DEVELOPMENT_GUIDE.zh-CN.md` 为重要架构参考。该文档明确区分当前已经实现的素材多状态基础与未来行为运行时目标。

## 四方向 voxel 对齐检查

“编辑体素”页顶部现在提供北、东、南、西四个观察方向。碰撞 voxel 仍然只有一份世界坐标数据；切换方向时，俯视网格和等距预览会同步旋转，并自动显示相应方向的分层图片。图片偏移与缩放按方向分别保存，便于逐方向确认图片和 voxel 是否重合。快捷键为 `Alt+0` 至 `Alt+3`。

## 2026-08-06 Habbo 相对注册与非破坏性图层平面

- Habbo 生成镜像方向时，同时反射主体图层的空间注册位置，不再只翻转各层位图。
- `objectData` 只用于生成归一化的局部 footprint；用户在 voxel 编辑网格中的绝对格坐标不进入自动规则。
- 图片与 voxel 的初始关系由 `registrationPx` 对齐到局部 footprint 注册点计算，默认注册点为局部 footprint 中心；人工四方向校准作为素材覆盖值保存。
- 每个图层拥有独立的 `surface.x/y/w/h` 与 RGBA backing surface。文档画布只是视口，移动图层不会重写或裁剪越界像素。
- 多样本规则见 `docs/HABBO_RELATIVE_REGISTRATION_RULES_MULTI_SAMPLE.zh-CN.md`；图层存储模型见 `docs/UNBOUNDED_LAYER_SURFACE.zh-CN.md`。

### Behavior / TestWorld 文档

- `docs/BEHAVIOR_TEST_WORLD.zh-CN.md`：独立素材库、State 0/1 门测试与 Behavior TestWorld 使用说明。
