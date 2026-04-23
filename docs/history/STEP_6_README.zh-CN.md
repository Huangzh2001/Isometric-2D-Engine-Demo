# Step 6 说明（placement application 收口）

这一步继续围绕三个目标推进：

1. **降耦合**
   - `placement.js` 中 drag commit / cancel 的收尾，优先改为走 `App.controllers.placement.completeDragInteraction(...)`
   - placement core 不再优先自己直接拼接 `finishDrag* + syncPlacementUi`

2. **提可维护性**
   - placement route audit 现在会记录新的 application 路径：
     - `placement.application.completeDragInteraction`
     - `placement.application.habbofile-selection`
   - asset import 日志增加：
     - `placement-application:applyPlacementIntent ... ok=1|0`

3. **保迁移性**
   - Habbo 资源导入后进入放置模式，优先走 `applyPlacementIntent(...)`
   - drag commit / cancel 的“状态收尾 + UI 同步”优先走 controller/application，再由 effects 落地

## 本次重点观察的 replay 证据

请跑 `start_replay.bat` 后，把 `logs` 打包发回。重点看：

- `acceptance-*-03-habbo-first-item-place.json`
  - `placement-routes-after-habbo-place`
  - `placement-effects-after-habbo-place`
- `acceptance-*-04-editor-x5-save-return-place.json`
  - `placement-routes-after-editor-roundtrip`
  - `placement-effects-after-editor-roundtrip`
- server / self-check 日志中是否出现：
  - `placement.application.completeDragInteraction`
  - `placement.application.habbofile-selection`
  - `placement-application:applyPlacementIntent`

## 静态检查

已通过：

- `node --check src/application/controllers/app-controllers.js`
- `node --check src/application/placement/placement.js`
- `node --check src/application/assets/asset-import.js`
- `node --check src/infrastructure/assets/asset-management.js`
- `python -m py_compile server/local_server.py`
