# P2b：src 四层实质归位与首个拆分

## 一、为什么需要 P2b

P2 把旧 `src` 顶层文件整体移入 `src/infrastructure/legacy/top-src/`，只能防止后续误改旧路径，但没有真正解决职责归属问题。按照 `AGENTS.md` 的要求，正确做法不是把一整套旧源码副本藏进 legacy，而是明确它们分别属于 presentation / application / core / infrastructure 哪一层；如果一个旧文件跨层，则拆分到多个 owner。

## 二、本轮处理

本轮完成三件事：

1. 删除 `src/infrastructure/legacy/top-src/` 旧源码副本，避免保留第二套可误读的代码。
2. 建立旧路径到四层 owner 的明确归位表，见 `docs/CANONICAL_OWNER_MAP.zh-CN.md`。
3. 从 `src/presentation/render/render.js` 中实际抽出一组纯几何工具到 `src/core/domain/spatial-geometry-core.js`。

## 三、实际拆分内容

新增 core 文件：

```text
src/core/domain/spatial-geometry-core.js
```

从 `src/presentation/render/render.js` 迁出的函数包括：

```text
pointInPoly
polyBounds
overlap2D
isBehind
makeAABB
rectCircleCollide
boxRectOverlap3D
buildOccupancy
```

这些函数只处理几何、包围盒、碰撞、占用表等纯数据逻辑，不依赖 DOM、Canvas context、本地存储、网络或平台 API，因此更符合 `core/domain`。

## 四、加载链路调整

`index.html` 新增：

```html
<script src="src/core/domain/spatial-geometry-core.js"></script>
```

该脚本位于 `runtime-state.js` 之后、渲染脚本之前。这样既能保留当前非模块化脚本加载模型下的全局函数名，又能把函数 owner 从 presentation/render 移到 core/domain。

## 五、仍然没有强拆的原因

`src/presentation/render/render.js`、`src/presentation/render/logic.js`、`src/infrastructure/legacy/state.js` 仍然很大，但这些文件包含大量相互依赖的全局变量、加载顺序和历史兼容接口。后续应继续按小步方式拆分，不应一次性大改。

建议后续拆分顺序：

1. `render.js`：继续抽纯色彩/材质 key / face merge 规则到 core/domain。
2. `logic.js`：把与 Canvas 无关的光照数学、向量计算、遮挡判定拆到 core/domain 或 core/lighting。
3. `legacy/state.js`：把 prefab registry、scene graph、runtime state 逐步迁入 `src/core/state/*`，只保留兼容导出。
4. `ui.js`：把用户动作调度进一步交给 `src/application/controllers/`，UI 文件只保留 DOM 同步。

## 六、检查

本轮更新了检查脚本：

```bash
node scripts/check_project_hygiene.js
node scripts/check_main_path_refs.js
```

现在检查脚本会阻止 `src/infrastructure/legacy/top-src/` 重新出现，并检查 `spatial-geometry-core.js` 是否在渲染脚本之前加载。
