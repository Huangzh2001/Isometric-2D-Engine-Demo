# P9d Render Logic Duplicate Cleanup

本轮目标是处理 `src/presentation/render/logic.js` 中的历史重复定义问题，而不是继续扩大功能重构范围。

## 背景

`logic.js` 中存在大量同名顶层函数重复定义，例如 lighting、shadow、projection 相关 helper。浏览器执行时后面的声明会覆盖前面的声明，因此前面的声明属于历史残留，会造成三个问题：

1. 文件体量膨胀；
2. AI/开发者难以判断哪个实现是有效实现；
3. 后续拆分时容易抽错旧实现。

## 本轮处理

已删除被后续声明覆盖的旧顶层函数声明，保留每个函数名的浏览器实际可见实现。

典型清理对象包括：

```text
lightForward
lightIncoming
areaSampleOffsets
drawProjectedShadow
drawPlayerShadow
drawLightGlow
drawLightShadows
drawProjectedComponentShadow
litFaceColor
```

## 边界

本轮没有迁移 scene / prefab 协议，没有修改 Canvas renderer 调用链，也没有重写 shadow 算法。它只移除同一文件中的死旧实现。

## 新增检查

新增：

```text
scripts/check_render_logic_boundary.js
tests/render-logic-boundary.test.js
```

检查内容：

1. `logic.js` 不允许出现重复顶层函数声明；
2. 已知历史重复函数必须只保留一个实现；
3. `logic.js` 必须保留 P9d cleanup notice；
4. 文件体量必须低于 P9d duplicate-cleanup 阈值。

验证命令：

```bash
node tests/render-logic-boundary.test.js
node scripts/check_render_logic_boundary.js
node scripts/check_project_hygiene.js
```

## 后续建议

`logic.js` 仍然偏大。后续如果继续治理，应优先拆分：

```text
lighting/shadow math -> core/domain 或 presentation/render/shadow
shadow debug helpers -> presentation/render/diagnostics
Canvas shadow drawing -> presentation/render/renderer
interaction/hit testing -> application/render 或 presentation/render/interaction
```
