# Root layout cleanup

This project keeps only user-facing launchers and page entries at the root level.

## Root level
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

## Moved files
- `local_server.py` -> `server/local_server.py`
- `run_server.bat` -> `server/run_server.bat`
- `_habbo_asset_root.json` -> `config/habbo_asset_root.json`
- `style.css` -> `styles/main.css`
- `editor-unified-v18.css` -> `styles/editor-v18.css`
- `server-main.log` -> `logs/server-main.log`

## Path handling
All launcher, HTML, and server paths were updated together so the app keeps working after the cleanup.


## P1 source-of-truth update
- Root-level `app.js / state.js / app-shell.js / lighting-editor.js` are deprecated stubs.
- Their canonical sources are `src/presentation/shell/app.js`, `src/infrastructure/legacy/state.js`, `src/presentation/shell/app-shell.js`, and `src/presentation/lighting/lighting-editor.js`.
- `src/presentation/render/logic.js.bak` was removed in P1.
