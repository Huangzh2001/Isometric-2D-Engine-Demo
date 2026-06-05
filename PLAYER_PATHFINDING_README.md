# Player Click-to-Move Pathfinding v1

新增内容：

1. 人物遮挡透明默认开启。
2. 角色页新增：
   - 启用点击移动 / Click-to-move pathfinding
   - 按人物高度自动设置最大跨越高度
3. 在查看 / view 模式下，点击地面或物体顶面后，角色会用 A* 路径移动到目标格。
4. A* 节点为网格 cell，邻接包含 8 方向；移动合法性复用现有 `resolvePlayerStepMove()`，所以会遵守：
   - 玩家代理体积
   - world bounds
   - body-blocked
   - step-up / drop
   - stairMaxStepUpCells

高度规则：

```
如果“按人物高度自动设置最大跨越高度”开启：
effectiveMaxStepUpCells = max(playerMaxStepUpCells, floor(playerHeightCells))
```

例如人物高 2 格时，有效最大跨越高度至少为 2，因此可以尝试跨越 1~2 格高差。

日志：

搜索：

```
[PLAYER-PATHFIND]
```

常见日志：

- `plan-ready`
- `plan-failed`
- `arrived`
- `cancel`
