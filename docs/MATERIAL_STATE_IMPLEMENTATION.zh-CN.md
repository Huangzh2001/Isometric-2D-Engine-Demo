# 素材多状态实现说明

版本：`20260807-material-states-v1`

## 数据模型

```text
Prefab
└── materialStates
    └── state
        ├── artwork
        │   └── facing 0..3
        │       └── layers
        ├── voxel
        ├── sprite.facingTransforms
        └── metadata
```

每个状态分别保存四方向分层图片、voxel/碰撞/锚点、当前 voxel 层以及四方向图片来源、镜像、偏移和缩放。顶层 `artwork`、`voxel`、`sprite` 仍指向当前活动状态，供旧主路径读取。

## 编辑器操作

状态栏支持：

- 新建空白图片状态；
- 复制整个状态；
- 重命名、删除、左右排序；
- 复制当前图层并粘贴到指定状态/方向；
- 复制当前方向全部图层到指定状态/方向。

切换状态前，application workflow 会先捕获当前 artwork、voxel 和 sprite transforms；切换后再统一应用目标状态，避免状态间串数据。

## Habbo 导入

Habbo importer 读取 visualization 中全部 animation state，并为每个 state：

1. 按四方向建立通用分层 artwork；
2. 按该 state 的 animation layer frame 选取 asset；
3. 应用当前方向专属 layer 属性；
4. 建立独立 voxel 快照；
5. 保存 `sourceStateId` 等来源信息。

自动评分仍用于选择初始活动状态，但不会再丢弃其他状态。

## 四层归属

- `src/core/domain/material-state-core.js`：纯状态数据、复制、规范化与兼容包规则。
- `src/application/assets/material-state-workflow-controller.js`：状态捕获、切换和跨状态复制编排。
- `src/presentation/editor/pixel-art-editor.js`、`START_V18_ONLY.html`：状态栏及用户交互。
- `src/infrastructure/habbo-calibration/habbo-swf-calibration-runtime.js`：SWF/XML 多状态解析。
- `src/presentation/editor/habbo-import-editor-feature.js`：将解析结果转换为统一编辑器状态。

## 兼容与残留

- 顶层当前状态字段继续保留，旧主程序仍可渲染当前状态。
- Habbo importer 仍调用一次旧的 `imageEditor.controller.setDocument` 作为兼容通知；随后 `replaceMaterialStates` 写入完整状态包，后者是 canonical 主路径。
- 本轮没有加入主游戏运行时的交互式状态切换；本轮完成的是素材编辑、导入、保存和恢复。

## 最小人工验收

1. 运行 `start_editor.bat`。
2. 新建两个状态，在两个状态中分别编辑不同 voxel，来回切换，确认互不覆盖。
3. 在状态 A 复制一个图层，选择状态 B 和方向，再粘贴。
4. 导出 `.hzhmat`，重新导入，确认状态数量、名称、图片、voxel 和对齐参数恢复。
5. 导入含多个 Habbo animation state 的 SWF，确认状态栏自动生成多个状态并可分别查看四方向。
