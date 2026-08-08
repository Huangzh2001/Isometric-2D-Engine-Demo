统一素材编辑器（图片 → 体素 → 行为 → 导出）

唯一入口：start_editor.bat
页面入口：START_V18_ONLY.html

顶部固定四步：
1. 编辑图片
   - 导入 PNG/JPG/WebP 等普通图片，或把 Habbo SWF 转换到同一通用图片工作流。
   - 北/东/南/西四方向切换编辑；每个方向有独立图层栈。
   - 支持像素工具、图层操作、状态复制与多 State 素材。

2. 编辑体素
   - 编辑碰撞、占地、体积、注册位置和其他空间属性。
   - 同一 State 使用一份世界空间 voxel；四方向用于观察和图片对齐。

3. 编辑行为
   - Behavior 随 Prefab 一起保存。
   - 声明 Capabilities、公开 Commands / Events，并编辑 default.lua。
   - 右侧可搜索 assets/prefabs 中的其他素材，读取其公开接口；点击 Command 可直接插入 Lua 调用代码。
   - 提供 Ctrl+Space 轻量补全，以及金币、经验、场景、spawn 等 Gameplay API 片段。
   - 当前仅实现编辑与数据保存；Lua Runtime、Gameplay API 执行层和真实 Component/Material 模拟仍是后续阶段。

4. 导出
   - 导出统一素材文件 .hzhmat。
   - 图层像素先进行 RGBA 行程编码（RLE），整个素材包再使用 gzip 压缩。
   - 同时保存四方向图层、voxel、Prefab 元数据、Behavior 以及来源信息。
   - 浏览器不支持 CompressionStream 时回退为 .hzhmat.json。

统一格式版本：hzh-unified-material-v1
详细格式：docs/UNIFIED_MATERIAL_FORMAT.zh-CN.md
重要架构：docs/EMERGENT_ASSET_SYSTEM_DEVELOPMENT_GUIDE.zh-CN.md


【Behavior TestWorld / 独立素材库】
- 行为页下方现在有隔离 TestWorld，可放置当前素材与外部素材库中的任意 .hzhmat/.json Prefab。
- 通过 start_editor.bat 启动时，可直接输入任意外部素材库文件夹路径；浏览器安全限制下也可用“选择本地文件夹”导入。
- 外部素材库不属于游戏工程 assets/prefabs；它被视为独立内容库。未来 Java Habbo 客户端或服务器分发可以复用同一素材格式。
- TestWorld 当前提供 Lua Test Runtime v0（子集），用于验证 onClick、State 0/1 切换、Prefab Command 调用、金币/经验/场景 Flag 等最小链路；不是完整 Lua VM。
