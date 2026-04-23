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
