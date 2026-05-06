# P10 Final Hygiene Freeze / 收尾冻结

本轮目标不是继续拆业务功能，而是把前面 P0–P9e 的结构治理结果固化下来，避免后续 AI 或开发者再次把职责塞回旧的大文件或旧路径。

## 一、本轮新增内容

新增统一检查入口：

```bash
node scripts/check_all_guardrails.js
```

该脚本串联当前所有结构守卫脚本，包括根目录卫生、主路径引用、render/domain/application/renderer 边界、state legacy bridge、controller/shell、render logic、editor/UI 以及本轮 final freeze 检查。

新增最终冻结检查：

```bash
node scripts/check_final_hygiene_freeze.js
```

它检查：

1. P10 必需脚本和文档是否存在；
2. `AGENTS.md` 是否包含 final freeze 规则；
3. `docs/CANONICAL_OWNER_MAP.zh-CN.md` 是否包含最终检查入口与剩余大节点说明；
4. `src/` 顶层是否仍然只保留四层目录；
5. `src/infrastructure/legacy/top-src/` 是否没有回退出现；
6. 根目录是否没有重新出现 evidence / delivery / 临时阶段产物；
7. 统一 guardrail 入口是否覆盖所有关键边界检查。

新增剩余大节点报告脚本：

```bash
node scripts/report_large_nodes.js
```

该脚本只做信息报告，不失败。它用于观察当前仍然较大的 JS 文件，帮助后续继续按 owner 小步拆分。

## 二、不得回退规则

从 P10 起，以下行为视为结构回退：

1. 重新创建 `src/render.js`、`src/ui.js`、`src/state.js`、`src/app.js` 等旧顶层源码路径；
2. 重新创建 `src/infrastructure/legacy/top-src/` 并把旧源码整体塞进去；
3. 在 `src/presentation/render/render.js` 中重新实现已迁出的 core/domain、application/render 或 renderer pass 逻辑；
4. 在 `src/application/render/*` 中直接访问 DOM、Canvas、Image、localStorage、fetch 等表现层或平台 API；
5. 在 `src/core/domain/*` 中引入 DOM、Canvas、window、localStorage、fetch 等副作用依赖；
6. 在 `logic.js` 中用重复顶层 function 声明制造隐式 override；
7. 在 `legacy/state.js` 中新增长期状态 owner；
8. 在 `ui.js`、`editor-unified-v18.js` 中重新持有已迁出的 boundary / diagnostics owner；
9. 不运行统一检查入口就交付结构性改动。

## 三、统一检查入口

后续任何涉及结构、owner、路径或大文件拆分的修改，至少运行：

```bash
node scripts/check_all_guardrails.js
```

如果修改了具体模块，还要运行对应测试，例如：

```bash
node tests/render-order-core.test.js
node tests/main-frame-renderable-assembler.test.js
node tests/state-legacy-boundary.test.js
node tests/editor-ui-boundary.test.js
```

`check_all_guardrails.js` 只代表结构守卫通过，不等同于完整浏览器交互验收。真实交互仍需本地打开主页面验证。

## 四、当前整理状态

当前项目已经完成：

```text
P0   根目录卫生整理
P1   主路径收口
P2   src 四层目录收口
P2b  实质四层职责归位
P3   Habbo placement core
P4   Isometric face core
P5   Terrain render core
P6a  Static world renderable builder
P6b  Static world render cache coordinator
P6c  Main frame renderable assembler
P7   Render order core
P8   Canvas2D draw primitives
P8b  Canvas2D shadow overlays
P8c  Static world face draw pass
P8d  Floor layer draw pass
P8e  Render diagnostics
P9a  Render transitional warning cleanup
P9b  State legacy bridge
P9c  Controller / shell boundary
P9d  Render logic duplicate cleanup
P9e  Editor / UI boundary
P10  Final hygiene freeze
```

综合结构治理进度约为 90%。这不是说所有大文件都已经消失，而是说主路径、owner 和防回退机制已经基本建立。

## 五、剩余大节点

详见：

```text
docs/REMAINING_LARGE_NODES.zh-CN.md
```

这些文件仍然偏大，但不应一次性大拆。后续应继续按“一个 owner、一条边界、一个测试/检查脚本”的方式小步推进。

## 六、推荐后续策略

后续如果继续优化，不建议再泛泛地“整理项目”。应使用明确任务名，例如：

```text
P11a：render.js frame pipeline wrapper thinning
P11b：app-controllers.js 按 scene / prefab / placement controller 分拆
P11c：canvas2d-renderer.js pass-level 后端整理
P11d：asset-management.js 与 scene-storage.js infrastructure service 收口
```

每一轮都必须包含：

1. 明确 owner；
2. 明确不改内容；
3. 新增或更新边界检查；
4. 跑 `node scripts/check_all_guardrails.js`；
5. 如果改运行主路径，必须本地浏览器验证。
