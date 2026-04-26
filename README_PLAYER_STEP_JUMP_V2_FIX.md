# PLAYER-STEP-JUMP-V2-FIX

本补丁用于修复 V1 中“日志显示 bind-player-step-core-missing，人物仍然跳不上台阶”的问题。

## 关键原因

V1 运行日志里出现：

    [P14][BOOT] bind-player-step-core-missing {"available":false}

说明 `src/core/domain/player-step-core.js` 没有在 `src/infrastructure/bootstrap/core-domain-bindings.js` 之前加载。
因此 application/player.js 只能走旧的平面碰撞逻辑，人物无法跳上台阶。

## 覆盖方式

把本压缩包中的文件按路径覆盖到项目根目录。

关键文件：

- index.html
- src/core/domain/player-step-core.js
- src/core/state/runtime-state.js
- src/infrastructure/bootstrap/core-domain-bindings.js
- src/application/player/player.js
- src/presentation/render/logic.js
- src/presentation/render/render.js
- src/presentation/render/renderer/canvas2d-renderer.js
- src/presentation/ui/ui-inspectors.js
- tests/player-step-core.test.js

## 验收日志

启动后搜索：

    [P14][BOOT] bind-player-step-core
    [player-step] feature-ready

撞一格台阶时搜索：

    [player-step] jump-start
    [player-step] move-accepted
    [player-step] jump-end

如果仍然出现：

    bind-player-step-core-missing

说明 `index.html` 没有被覆盖，或者你运行的不是这个补丁所在的项目目录。
