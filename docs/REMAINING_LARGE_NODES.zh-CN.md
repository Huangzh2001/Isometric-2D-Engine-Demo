# Remaining Large Nodes / 剩余大节点清单

本文件记录 P10 收尾冻结后仍然偏大的 JS 文件。它们不是立即错误，但属于后续最容易再次产生耦合的区域。后续不得通过“一次性大拆”处理，应按 owner 小步迁移。

生成方式：

```bash
node scripts/report_large_nodes.js 50000
```

## 一、当前大节点快照

| 文件 | 大小 | 当前性质 | 后续建议 |
|---|---:|---|---|
| `src/presentation/render/render.js` | 约 425 KB | presentation render hub，仍含 frame pipeline、wrapper、camera/render 接入 | 后续只做 wrapper thinning，不再塞 domain/application 逻辑 |
| `src/application/controllers/app-controllers.js` | 约 142 KB | application controller 大文件 | 按 scene / prefab / placement / asset / editor controller 小步拆 |
| `src/presentation/render/logic.js` | 约 132 KB | render interaction / lighting / shadow transitional 文件 | 继续拆 interaction、lighting/shadow helper 到明确 owner |
| `src/presentation/editor/editor-unified-v18.js` | 约 121 KB | editor v18 表现层大壳 | 按 toolbar、canvas、selection、health diagnostics 继续拆 |
| `src/infrastructure/legacy/state.js` | 约 105 KB | legacy compatibility state | 不得新增长期状态 owner；继续把 bridge/selector/action 迁出 |
| `src/presentation/render/renderer/canvas2d-renderer.js` | 约 99 KB | Canvas2D renderer 主后端 | 后续按 draw pass / pipeline stage 继续拆 |
| `src/presentation/ui/ui.js` | 约 97 KB | UI DOM 同步与控件绑定 | 继续拆 panel / inspector / command binding |
| `src/infrastructure/self-check/scenario-runner.js` | 约 93 KB | 自检/回放运行器 | 暂不优先拆；保持稳定性优先 |
| `src/presentation/shell/app.js` | 约 84 KB | shell 主循环与 DOM/canvas 接线 | 只保留启动壳层与事件入口，继续迁出诊断/动作编排 |
| `src/infrastructure/assets/asset-management.js` | 约 81 KB | asset infrastructure 大文件 | 按 scan / load / cache / path resolve 拆 service |
| `src/application/render/static-world-renderable-builder.js` | 约 68 KB | static world renderable 构建流程 | 已是 application owner；仅在行为稳定后继续细分 |
| `src/presentation/floor-editor/floor-editor-shell.js` | 约 63 KB | floor editor shell | 暂不优先；后续按 shell/editor state/UI 拆 |
| `src/infrastructure/storage/scene-storage.js` | 约 60 KB | scene storage infrastructure | 按 persist / restore / validation / migration 拆 |
| `src/application/placement/placement.js` | 约 54 KB | placement application flow | 按 preview / commit / validation / effect adapter 拆 |

## 二、风险排序

当前最值得关注的剩余大节点排序：

```text
1. src/presentation/render/render.js
2. src/application/controllers/app-controllers.js
3. src/presentation/render/logic.js
4. src/presentation/editor/editor-unified-v18.js
5. src/infrastructure/legacy/state.js
6. src/presentation/render/renderer/canvas2d-renderer.js
7. src/presentation/ui/ui.js
```

## 三、后续禁止事项

1. 不要把新的 feature 直接塞进这些大文件，除非该文件就是明确 owner。
2. 如果必须修改大文件，优先先抽出小 owner，再让大文件 thin wrapper 调用。
3. 不要在这些文件里新增跨层依赖，例如 presentation 直接写核心规则，application 直接操作 DOM/Canvas，core 直接访问平台 API。
4. 不要用同名 function 重新声明制造隐式覆盖。
5. 不要把未完成拆分的旧代码整体丢进 legacy。

## 四、推荐后续拆分顺序

```text
P11a render.js wrapper thinning
P11b app-controllers.js controller split
P11c canvas2d-renderer.js draw pass split
P11d render/logic.js interaction owner split
P11e asset-management / scene-storage infrastructure split
```

每一轮只处理一个 owner，并补对应测试或边界检查。
