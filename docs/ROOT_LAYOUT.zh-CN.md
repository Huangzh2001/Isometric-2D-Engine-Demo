# 根目录整理说明

本项目已将根目录收敛为“用户可直接理解的入口”，把服务、配置、样式、日志下沉到独立目录中。

## 根目录保留
- `README.md`
- `start.bat`
- `start_editor.bat`
- `index.html`
- `START_V18_ONLY.html`
- `src/`
- `assets/`
- `styles/`
- `server/`
- `config/`
- `logs/`
- `docs/`

## 已迁移文件
- `local_server.py` -> `server/local_server.py`
- `run_server.bat` -> `server/run_server.bat`
- `_habbo_asset_root.json` -> `config/habbo_asset_root.json`
- `style.css` -> `styles/main.css`
- `editor-unified-v18.css` -> `styles/editor-v18.css`
- `server-main.log` -> `logs/server-main.log`

## 路径处理
本次整理同步修正了启动脚本、HTML 和本地服务中的相关路径，目标是在保持行为不变的前提下让根目录更整洁。


## P1 唯一真实源码位置
- 根目录 `app.js / state.js / app-shell.js / lighting-editor.js` 已变为废弃 stub。
- 对应真源码分别位于 `src/presentation/shell/app.js`、`src/infrastructure/legacy/state.js`、`src/presentation/shell/app-shell.js`、`src/presentation/lighting/lighting-editor.js`。
- `src/presentation/render/logic.js.bak` 已在 P1 中移除。
