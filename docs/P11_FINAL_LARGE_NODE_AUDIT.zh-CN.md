# P11 Final Large Node Audit / Guardrail Freeze

本文件记录 P11 系列第一轮大耦合治理的收尾审计结果。它不是新的重构计划，而是用于后续 AI / 开发者判断当前架构边界、剩余风险和下一阶段入口的冻结说明。

## 1. 当前结论

截至本次收尾，第一轮治理已经完成以下目标：

- `canvas2d-renderer.js` 已从 Canvas2D 大黑盒收口为 renderer adapter / facade，主要渲染子职责已经迁入 `src/presentation/render/renderer/` 下的 owner 文件。
- `asset-management.js` 已从 asset 大杂烩收口为 asset facade，Habbo library、root config、file fetch、placement import、workflow、custom prefab storage、prefab scan 等职责已经迁出。
- `scene-storage.js` 已完成 snapshot builder / applier 拆分，并低于 50KB 大节点阈值。
- `ui.js` 已完成 camera/render panel 与 terrain panel refresh 拆分，但仍然是后续 UI 治理重点。
- `app-controllers.js` 已完成 registry、diagnostics、terrain apply / generation / clear 拆分，但 scene / asset / view / editor action 仍是后续 controller 治理重点。

当前状态应理解为：**第一轮大节点减压完成，不等于整体架构已经完全理想化。**

## 2. 当前超过 50KB 的主要大节点

当前 `node scripts/report_large_nodes.js` 的结果显示，超过 50KB 的 JS 文件仍有 11 个：

| 文件 | 约大小 | 当前判断 |
|---|---:|---|
| `src/presentation/render/render.js` | 414.5 KB | 仍是最大 facade / compatibility hub，后续不应继续塞新逻辑 |
| `src/presentation/render/logic.js` | 130.9 KB | transitional render logic，后续应继续按 interaction / hit-test / projection owner 迁移 |
| `src/application/controllers/app-controllers.js` | 127.5 KB | 已开始收口，但仍有 scene / asset / view / editor action 混合 |
| `src/presentation/editor/editor-unified-v18.js` | 120.8 KB | editor shell 大节点，后续按 editor feature owner 拆 |
| `src/infrastructure/legacy/state.js` | 105.1 KB | legacy 兼容层，禁止继续加入新主路径逻辑 |
| `src/infrastructure/self-check/scenario-runner.js` | 93.0 KB | self-check 执行器偏大，但属于测试/审计工具侧 |
| `src/presentation/shell/app.js` | 83.7 KB | shell bootstrap 偏大，后续按 boot phase owner 拆 |
| `src/presentation/ui/ui.js` | 78.1 KB | 已拆一部分 UI refresh，但仍是 UI 治理重点 |
| `src/application/render/static-world-renderable-builder.js` | 67.5 KB | application render builder 偏大，后续按 terrain/static/prefab builder 拆 |
| `src/presentation/floor-editor/floor-editor-shell.js` | 62.8 KB | floor editor shell 偏大 |
| `src/application/placement/placement.js` | 53.9 KB | placement flow 偏大，但仍接近阈值 |

## 3. 本轮已经降到阈值以下的关键文件

以下文件已经不再是 >50KB 大节点，但仍需维持 facade / owner 边界，不允许回填新逻辑：

| 文件 | 约大小 | 状态 |
|---|---:|---|
| `src/presentation/render/renderer/canvas2d-renderer.js` | 32.2 KB | 已接近 Canvas2D adapter facade |
| `src/infrastructure/assets/asset-management.js` | 34.7 KB | 已接近 asset facade |
| `src/infrastructure/storage/scene-storage.js` | 47.3 KB | 已低于阈值，但 local/file IO 仍可后续继续拆 |

## 4. 新 owner 文件健康检查

本轮新增的主要 owner 文件均低于 50KB。较大的 owner 包括：

| 文件 | 约大小 | 说明 |
|---|---:|---|
| `src/presentation/render/renderer/canvas2d-renderable-order-draw.js` | 22.8 KB | 只负责 renderable-order draw loop / draw stats |
| `src/infrastructure/assets/habbo-library-service.js` | 21.8 KB | 只负责 Habbo library summary / page / index 获取 |
| `src/presentation/ui/ui-terrain-panel-refresh.js` | 21.7 KB | 只负责 terrain panel form / refresh |
| `src/presentation/render/renderer/canvas2d-static-bitmap-run-cache.js` | 21.6 KB | 只负责 static bitmap run cache / reuse / bitmap draw |
| `src/presentation/render/renderer/canvas2d-frame-pipeline.js` | 16.1 KB | 只负责 Canvas2D frame pipeline orchestration |
| `src/presentation/render/renderer/canvas2d-active-render-frame.js` | 13.6 KB | 只负责 active renderFrame adapter body |

这些 owner 当前没有变成新的大节点，但后续开发必须遵守：**不要把 unrelated draw pass、UI、controller、storage、asset 或 scene mutation 继续塞进这些 owner。**

## 5. 后续开发硬规则

后续 AI / 开发者必须遵守以下规则：

1. 不要把新逻辑继续塞进 `render.js`、`logic.js`、`app-controllers.js`、`ui.js`、`canvas2d-renderer.js`、`asset-management.js`、`scene-storage.js`。
2. 如果必须改这些文件，优先新增明确 owner，然后让旧文件只做 thin wrapper / facade / wiring。
3. 每个新增 JS 文件只负责一个明确功能域；如果新文件开始超过约 400–600 行或承担两个以上独立职责，应继续拆或暂停说明风险。
4. 禁止新增与 `src/core`、`src/application`、`src/presentation`、`src/infrastructure` 平级的第五层源码目录。
5. `application` 不应直接操作 DOM、Canvas、localStorage、window/document；相关能力应由 `presentation` 或 `infrastructure` owner 承接。
6. `core` 不应依赖 `presentation` 或 `infrastructure`。
7. 新增边界必须新增或更新轻量 boundary test / guardrail。

## 6. 建议的后续入口

如果后续还要继续治理，建议按以下优先级处理：

1. `src/application/controllers/app-controllers.js`：scene / asset / view / editor action owner 拆分。
2. `src/presentation/ui/ui.js`：panel refresh、tool state refresh、event binding owner 拆分。
3. `src/presentation/render/render.js` 与 `logic.js`：继续把 compatibility hub 内部真实逻辑迁往 render/interaction、renderables、diagnostics、renderer owner。
4. `src/presentation/editor/editor-unified-v18.js`：按 editor shell / command / panel / import-export 分离。
5. `src/infrastructure/legacy/state.js`：继续限制为 legacy compat，不允许成为新主路径。

## 7. 当前收尾判断

本次收尾后，项目可以暂停第一轮大重构，转回功能开发。后续遇到 bug 时，应按 owner 定位并小步拆分，而不是再次开启全项目大拆。
