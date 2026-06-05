# Player Path Debug Preview v7

v6 红线不显示的根因：

- renderer state 中没有 `state.stage`；
- Pixi 实际 stage 在 `state.pixiApp.stage`；
- v6 把 overlay 挂到不存在的 `state.stage`，所以红线没有进入实际 Pixi stage；
- 同时 Pixi v8 的 Graphics API 不能只依赖旧的 `lineStyle/drawCircle`。

v7 修复：

1. 使用真实 Pixi stage：

```
state.pixiApp.stage
```

2. 路径 overlay：

```
pixiApp.stage
  └── pixi-player-path-debug-overlay-layer
        └── pixi-player-path-debug-line
```

3. 绘制逻辑：

```
每一个 A* waypoint / 人物当前位置的格中心画红点
再按顺序用红线连接这些点
```

4. 兼容 Pixi v8：

```
g.moveTo(...)
g.lineTo(...)
g.stroke({ width, color, alpha })
g.circle(...)
g.fill(...)
```

并保留旧版 fallback。

验证日志：

```
[PLAYER-PATH-DEBUG] draw-summary
renderer: "pixi-v8-graphics-overlay-step-centers"
drawn: true
pointCount >= 2
projectedCount >= 2
```
