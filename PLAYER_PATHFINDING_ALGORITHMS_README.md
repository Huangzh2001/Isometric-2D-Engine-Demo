# Player Pathfinding Algorithms v9

角色页整理：

- 代理体积
- 移动
- 遮挡透明

“移动”子标题下新增：

```
寻路算法
```

可选算法：

1. `A* / A-star`
   - 默认推荐。
   - `f = g + h`
   - 兼顾路径代价和目标方向。

2. `Weighted A*`
   - `f = g + 1.6h`
   - 更偏向目标方向，可能更快、更直，但不保证最优。

3. `Dijkstra`
   - `f = g`
   - 不使用启发式，会更均匀扩散，通常更慢，但按代价最稳。

4. `BFS`
   - `f = step count`
   - 按最少步数找路，忽略对角/高度代价差异，方便看“格子步数最短”的路径。

5. `Greedy Best-First`
   - `f = h`
   - 只强烈追目标，绕障碍时可能走得不优，但路径差异明显。

兼容性：

所有算法仍复用同一个合法性判断：

```
resolvePlayerStepMove()
```

所以它们都兼容：

- 人物代理体积
- 允许/禁止跨越高格
- 按人物高度自动设置最大跨越高度
- body-blocked / world bounds / step-up / drop

红色路径预览会使用当前选择的算法。切换算法时会取消当前自动移动路径，并清空 hover 预览，移动鼠标后重新规划。

日志字段：

```
[PLAYER-PATHFIND]
algorithm
algorithmLabel
algorithmDescription
iterations
expandedCount
cost
depth
blockedReasons
```

说明：

JPS、HPA*、D* Lite、Flow Field 暂未作为可选项加入本版，因为它们不是简单换优先级就能正确工作的算法：
- JPS 对高度/体积碰撞/对角阻挡约束较复杂；
- HPA* 需要先构建 chunk portal graph；
- D* Lite 主要用于动态地图增量重规划；
- Flow Field 主要用于大量单位共享同一目标。

本版先加入能真实影响路径、能稳定对比的 5 种网格搜索策略。
