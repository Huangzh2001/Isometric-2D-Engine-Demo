# HZH 统一素材格式

格式标识：`hzh-unified-material-v1`

默认扩展名：`.hzhmat`

## 目的

同一种素材文件同时保存：

1. 四方向二维图像；
2. 每个方向的独立图层；
3. voxel 占地、碰撞与空间属性；
4. Prefab 元数据；
5. 原始导入来源及可选的 Habbo 校准数据；
6. Prefab Behavior：Capabilities、公开 Commands / Events 与 Lua 源码。

普通图片、Habbo SWF 以及未来新增的导入器都必须转换为该统一模型，不新增平行编辑器或平行素材格式。

## 顶层结构

```json
{
  "format": "hzh-unified-material-v1",
  "version": 2,
  "name": "material-name",
  "artwork": {},
  "voxel": {},
  "materialStates": {
    "activeStateId": "state_0",
    "states": []
  },
  "artworkStateBundle": {},
  "voxelStateBundle": {},
  "prefab": {},
  "source": {},
  "exportedAt": "ISO-8601"
}
```


## materialStates（版本 2）

版本 2 的长期数据结构是：

```text
Prefab
└── state
    ├── artwork
    │   └── facing
    │       └── layers
    ├── voxel
    └── sprite / facingTransforms
```

每个状态独立保存：

- 一份四方向分层 `artwork`；
- 一份 voxel、碰撞、锚点和编辑网格快照；
- 一份按方向保存的 `sourceFacing`、`flipX`、`flipY`、`offsetPx`、`scale`；
- 状态名称、来源状态 ID 和导入元数据。

`artwork` 与 `voxel` 顶层字段仍保存当前活动状态，供旧读取路径兼容。完整数据以 `materialStates` 为准。`artworkStateBundle` 和 `voxelStateBundle` 是便于旧工具分别读取图片状态与体素状态的兼容视图。

编辑器支持新建、重命名、复制、删除和排序状态；支持把单图层或当前方向全部图层复制到指定状态与指定方向。复制后的图层、像素和 voxel 都是深拷贝，不共享可变引用。

## Habbo 动画导入（当前过渡实现）

当前 importer 已能读取选定 visualization 尺寸下多个 `<animation id>`，但现阶段仍把这些 animation 结果映射进 `materialStates`，这是**过渡实现，不是长期语义**。

长期模型必须遵守：

```text
State != Animation != Frame

State
└── Facing
    └── Animation
        └── Frame
            └── Layers
```

因此未来真正的多帧动画导入应进入 `Animation / Frame` 维度，而不是把 16 帧动画错误地变成 16 个 State。现有 `sourceStateId` 等字段仅用于兼容当前导入结果。

## artwork

`artwork` 是 `HZH-PIXEL-ART-CORE-V1` 文档：

- `width`、`height`：工作像素分辨率；
- `facings`：固定四个方向；
- 每个方向拥有独立 `layers`；
- 每层保存名称、显隐、透明度和 RGBA 像素；
- 像素使用 RGBA 行程编码，减少连续相同像素的重复数据。

方向编号：

| facing | 含义 |
|---:|---|
| 0 | 北 / N |
| 1 | 东 / E |
| 2 | 南 / S |
| 3 | 西 / W |


## prefab.behavior（Behavior V1）

Behavior 当前作为 Prefab 的一部分保存：

```json
{
  "behavior": {
    "version": "hzh-behavior-v1",
    "language": "lua",
    "script": "function onInteract(actor)\nend",
    "capabilities": ["Damageable", "Sleepable"],
    "publicApi": {
      "commands": [
        { "name": "sleep", "args": "actor", "description": "" }
      ],
      "events": [
        { "name": "sleepStarted", "args": "actor", "description": "" }
      ]
    },
    "properties": [],
    "references": []
  }
}
```

当前编辑器已经可以编辑 Lua 文本、Capabilities 和 Commands / Events，并从 `assets/prefabs` 搜索其他 Prefab 的公开接口后插入调用代码。当前版本**只负责编辑和持久化**；Lua Runtime、Gameplay API 实际执行、Component / Material 模拟仍未实现。

## 压缩

导出顺序：

1. 每层 RGBA 像素转换为 RLE；
2. 整个 JSON 包使用 gzip 压缩；
3. 写入 `.hzhmat`。

若运行环境不支持浏览器 `CompressionStream`，编辑器回退为未压缩的 `.hzhmat.json`，数据结构不变。

## 运行时兼容

当前 Prefab 中仍保留合成后的兼容图像字段，供现有主程序使用；完整四方向和分层像素保存在 `artwork` 中。主程序后续应以 `artwork` 为长期事实来源，兼容合成图只作为迁移字段。

## 扩展原则

- 新素材来源只增加 importer，不增加新编辑器。
- importer 只负责将外部格式转换为统一 `artwork + voxel + prefab`。
- 编辑、保存和导出流程保持一致。
- 格式升级必须增加版本号，并提供向后读取策略。
