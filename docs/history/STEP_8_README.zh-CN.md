# Step 8：四层结构雏形

本轮目标不是为了拆而拆，而是先把 `src/` 立成四层骨架，使未来迁移时：

- 第 2 层（application）与第 3 层（core）尽量保留
- 第 1 层（presentation）重写
- 第 4 层（infrastructure）中的平台适配/存储实现重写
- 仅保留少量装配与兼容桥调整

## 本轮结构

- `src/presentation/`
- `src/application/`
- `src/core/`
- `src/infrastructure/`

## 本轮日志重点

跑 `start_replay.bat` 后，请重点查看：

- `architecture-layers-baseline`
- `architecture-layers-after-habbo-place`
- `architecture-layers-after-editor-roundtrip`
- acceptance summary 里的 `architectureLayers`
- 以及已有的 `sceneSession / stateActions / placement-routes / placement-effects`

## 这轮不是终态

这一步只是把四层骨架先立起来，并保持 replay 闭环可验证。少数跨层模块仍然存在，需要后续继续纯化。
