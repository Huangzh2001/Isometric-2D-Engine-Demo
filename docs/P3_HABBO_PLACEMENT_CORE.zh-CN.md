# P3：Habbo 放置偏移纯规则拆分

## 一、为什么做这一轮

P2b 已经证明不能把旧源码整体藏入 legacy，而应按职责拆分。`src/presentation/render/render.js` 仍然承担过多职责，其中一部分 Habbo imported object 的放置偏移、pixel/cell shift、room origin baseline、layer local box 计算并不依赖 Canvas、DOM、Image 或平台 API，因此不应继续由 presentation/render 直接拥有。

## 二、本轮新增 core owner

新增：

```text
src/core/domain/habbo-placement-core.js
```

该文件属于 `core/domain`，只保存纯计算逻辑。

## 三、从 render.js 抽出的职责

迁出的纯规则包括：

```text
getHabboPlacementShift
pixelShiftToCellShift
cellShiftToPixelShift
getHabboPlacementDecomposition
getHabboPlacementCellShift
getHabboProxyVisualShift
getHabboInstanceVisualShift
getHabboRoomOrigin
getHabboLayerLocalBox
```

这些逻辑的共同特点是：输入为 prefab、rotation、tile metrics、origin/anchor、layer offset 等普通数据；输出为 shift、cell shift、screen origin 或 local box；不直接绘制，也不访问 DOM / Canvas / localStorage / server API。

## 四、render.js 当前保留的职责

`src/presentation/render/render.js` 仍然保留薄包装函数，用于：

```text
读取当前 settings.tileW / settings.tileH
注入 iso 投影函数
调用 core API
继续处理 Canvas、Image、Habbo composite cache、drawImage、blend mode 等表现层逻辑
```

也就是说，本轮不是删除 render 层的 Habbo 渲染，而是把其中的“纯放置数学”转移到 core。

## 五、加载链路

`index.html` 新增：

```html
<script src="src/core/domain/habbo-placement-core.js"></script>
```

并要求它位于：

```text
src/core/domain/spatial-geometry-core.js
之后
src/presentation/render/render.js
之前
```

`src/infrastructure/bootstrap/core-domain-bindings.js` 也会将其绑定到：

```text
window.App.domain.habboPlacementCore
```

## 六、验证

本轮新增测试：

```bash
node tests/habbo-placement-core.test.js
```

并更新：

```bash
node scripts/check_main_path_refs.js
node scripts/check_project_hygiene.js
```

检查脚本会阻止 `index.html` 漏加载或晚加载 `habbo-placement-core.js`。
