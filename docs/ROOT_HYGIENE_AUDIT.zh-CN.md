# P0 工程卫生整理记录

本轮整理只处理工程卫生问题，不修改运行逻辑、渲染逻辑、人物移动、地形系统或编辑器交互。

## 一、根目录处理原则

根目录只保留面向使用者的入口、启动脚本、顶层说明和项目主目录。阶段性交付说明、证据文件、临时验证文件不再直接放在根目录。

保留在根目录的主要入口包括：

- `index.html`
- `START_V18_ONLY.html`
- `START_FLOOR_EDITOR.html`
- `AUTO_EDITOR_SAVE_X5.html`
- `start.bat`
- `start_editor.bat`
- `start_floor_editor.bat`
- `start_replay.bat`
- `start_self_check.bat`
- `AGENTS.md`
- `README.md`

其中 `AUTO_EDITOR_SAVE_X5.html` 看起来像临时文件，但当前被 `src/infrastructure/self-check/scenario-runner.js` 引用，用于 editor auto-save / replay 场景，所以本轮不移动。

## 二、本轮已归档文件

归档到 `docs/evidence/`：

- `v45_five_face_evidence.json`
- `v46_real_face_evidence.json`
- `v47_semantic_texture_evidence.json`

归档到 `docs/archive/player-step/`：

- `README_PLAYER_STEP_JUMP_V2_FIX.md`
- `README_PLAYER_STEP_JUMP_V3_DROP_ANIM.md`

归档到 `docs/archive/delivery-notes/`：

- `v47_semantic_texture_delivery_notes.md`
- `v50_committed_faces_delivery_notes.md`

归档到 `docs/archive/misc/`：

- `testwrite`

## 三、本轮新增工程约束

新增 `.gitignore`，用于阻止以下文件继续进入日常改动：

- Python `__pycache__` / `*.pyc`
- 运行日志 `logs/**/*.log`
- 自检输出 `logs/self-check/`
- 根目录临时 evidence / delivery notes
- 编辑器或系统临时文件
- 本机私有配置 `config/*.local.json`

新增 `scripts/check_project_hygiene.js`，用于检查：

- 根目录是否出现未登记文件；
- 根目录是否再次出现 evidence / delivery notes / testwrite；
- `server/__pycache__` 或类似 Python 缓存是否存在；
- `logs/` 下是否存在运行日志；
- 关键入口是否存在；
- `AUTO_EDITOR_SAVE_X5.html` 是否仍被 scenario-runner 引用。

## 四、本轮未处理的问题

本轮没有移动或删除 `src/` 顶层旧文件，例如：

- `src/render.js`
- `src/logic.js`
- `src/ui.js`
- `src/state.js`
- `src/editor-unified-v18.js`

原因是它们可能仍被旧测试、历史入口或人工排查使用。后续应单独做一轮 canonical owner 收口，而不是在 P0 工程卫生阶段直接删除。

本轮也没有重置以下既有运行状态改动：

- `assets/scenes/*.json`
- `assets/prefabs/*.json`
- `config/habbo_asset_root.json`
- `logs/**/*.log`

原因是这些文件在用户上传的包中已经处于修改状态，本轮不判断哪些是用户有效资产、哪些是运行产物。

## 五、建议后续开发规则

后续每轮 AI 修改结束后，至少运行：

```bash
node scripts/check_project_hygiene.js
```

如果继续新增阶段性证据文件，应直接写入：

```text
docs/evidence/
```

如果继续新增交付说明或旧版本说明，应直接写入：

```text
docs/archive/
```
