# P11a-2 Render Hit-Test / Projection Boundary

本轮目标是继续收口 `src/presentation/render/logic.js`，但只处理低风险的 screen/world 投影辅助，不改 hover、selection、placement preview、shadow 或 Canvas 绘制行为。

## 新增 owner

```text
src/presentation/render/interaction/render-hit-test.js
```

该文件负责：

```text
worldToScreen
screenToFloor
computeFloorScreenBounds
```

它属于 `presentation/render/interaction`，因为这些函数依赖 camera、settings、view rotation 和 projection config；它们不是纯 domain，也不是 Canvas renderer。

## logic.js 的变化

`logic.js` 中保留兼容函数名：

```text
iso
screenToFloor
computeFloorScreenBounds
```

但实现已经变成 thin wrapper，委托给 `render-hit-test.js`。

## 不变范围

本轮没有修改：

```text
hover / selection 流程
placement preview
shadow / lighting 计算
Canvas 绘制
scene / prefab 协议
```

## 检查命令

```bash
node tests/render-hit-test-boundary.test.js
node scripts/check_render_hit_test_boundary.js
node scripts/check_all_guardrails.js
```
