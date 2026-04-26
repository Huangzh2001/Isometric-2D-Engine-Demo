# PLAYER-STEP-JUMP-V3-DROP-ANIM

本补丁在 V2 跳上一级台阶基础上，补充“下台阶动画”。

## 修改点

- `src/application/player/player.js`
  - `drop` 不再瞬间把 `visualZ` 同步到低层。
  - `jump-up` 和 `drop` 都走同一个 vertical transition。
  - 新增日志：`[player-step] drop-start`、`[player-step] drop-end`。
  - 垂直动画过程中阻止再次触发上/下台阶，阻挡原因：`vertical-transition-active`。

- `src/core/state/runtime-state.js`
  - 新增：`playerDropDurationSec: 0.16`
  - 新增：`playerDropLiftCells: 0.16`

## 验证日志

上台阶：

```text
[player-step] jump-start
[player-step] jump-end
```

下台阶：

```text
[player-step] drop-start
[player-step] drop-end
```
