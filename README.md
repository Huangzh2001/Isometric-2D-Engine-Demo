# Isometric Room Tool

> Attention: 当前项目只是为了熟悉Isometric 2d游戏引擎的底层原理，验证完毕，已停止开发，并迁移到更成熟的商用引擎。

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
