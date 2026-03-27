# 素材接入流程说明

## 当前素材来源
当前主程序实际使用的素材来源主要有两类：

1. `assets/prefabs/` 目录下的本地 prefab JSON 文件
2. 通过本地服务暴露出来的 Habbo 外部资源

此外，在整个工作流中还存在第三类来源：

3. 由独立素材编辑器导出并保存到 prefab 库中的素材

## 当前内部统一入口
当前素材接入的主要入口已经集中到 `src/asset-management/asset-management.js`。

该模块负责：
- 读取 prefab 索引
- 扫描并导入 prefab JSON
- 刷新 prefab 选择 UI
- 读取 Habbo 根目录配置
- 查询 Habbo 资源库 summary / page 接口
- 读取 Habbo SWF buffer 并交给运行时导入逻辑
- 维护面向资源库的状态

## 当前运行流程
### Prefab JSON 流程
`assets/prefabs/*.json` -> prefab 索引接口 -> 读取 JSON -> `importPrefabDefinition(...)` -> prefab 注册表 -> 放置 UI

### Habbo 流程
Habbo 根目录配置 -> Habbo 资源库 summary/page 接口或 Habbo index 接口 -> 读取 SWF buffer -> `importHabboSwfToSceneFromBuffer(...)` -> prefab 注册表 -> 放置 UI

### 编辑器导出 prefab 流程
编辑器导出 -> 保存为 prefab JSON -> 被 prefab 索引扫描 -> `importPrefabDefinition(...)` -> prefab 注册表 -> 放置 UI

## 未来新增素材来源时的原则
新增素材来源时应遵守以下原则：
- 不要把某种来源的特殊逻辑直接写进渲染、人物、碰撞等核心系统
- 必须先经过 asset-management 层接入
- 应先把外部数据转换为现有 prefab 兼容的内部表示
- 除非单独安排 schema 迁移轮次，否则不要改 prefab / scene 数据结构
- 将某一来源的 fetch / parse / import 逻辑集中保存在 asset-management 层中

## 本轮不做的事情
- 不建立插件框架
- 不建立完整的 source registry 抽象
- 不改造成 ES module 架构
- 不重新设计 prefab 数据结构
