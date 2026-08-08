# Player Step-over Toggle v8

新增角色页开关：

```
允许跨越高格 / Allow step-up
```

规则：

```
允许跨越高格 = 开
  effectiveMaxStepUpCells 按原逻辑计算：
  - 手动 playerMaxStepUpCells
  - 若“按人物高度自动设置最大跨越高度”开启：
    max(playerMaxStepUpCells, floor(playerHeightCells))

允许跨越高格 = 关
  effectiveMaxStepUpCells = 0
```

兼容性：

A* 寻路本身不需要单独改算法，因为每一步都复用：

```
resolvePlayerStepMove()
```

而 `resolvePlayerStepMove()` 收到的 `maxStepUpCells` 来自：

```
getPlayerEffectiveMaxStepUpCells()
```

所以关闭“允许跨越高格”后：

- 手动移动不能上台阶；
- 点击移动 A* 也不会把需要上台阶的格子加入路径；
- 如果必须跨越高格才可到达，则返回 `no-path`；
- 如果存在平路或绕路，A* 会自动绕路。

切换该设置时，会取消当前路径：

```
cancelPlayerPath('step-over-setting-changed')
```

日志字段：

```
[PLAYER-PATHFIND]
effectiveMaxStepUpCells
playerStepOverEnabled
blockedReasons
```
