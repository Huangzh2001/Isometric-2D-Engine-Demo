# 素材管理系统重构任务说明

## 目标
将主程序中的素材管理与导入逻辑抽离为独立模块，使 prefab 加载、素材索引刷新、Habbo 资源接入与资源库相关逻辑更容易维护，同时保持现有运行行为不变。

## 本轮允许的改动
- 新增 `src/asset-management/asset-management.js`
- 将以下逻辑集中到该文件：
  - prefab 索引读取
  - prefab 扫描 / 刷新逻辑
  - Habbo 根目录配置读取与设置
  - Habbo 资源库 summary / page / index 读取
  - Habbo 文件 buffer 读取
  - prefab 下拉列表刷新逻辑
  - 自定义 prefab 本地持久化辅助逻辑
  - 面向场景保存/恢复的 Habbo prefab 引用辅助逻辑
- 在 `index.html` 中增加最小必要的脚本引用
- 保持现有全局函数调用兼容

## 本轮禁止的改动
- 不修改光影系统
- 不修改人物移动系统
- 不修改碰撞系统
- 不修改排序 / 遮挡逻辑
- 不修改 scene-storage 的职责与行为
- 不修改 prefab 数据结构
- 不修改 scene 数据结构
- 不修改 API 路径
- 不修改字段名
- 不修改编辑器逻辑
- 不改造成 ES module 架构
- 不做大规模目录迁移
- 不顺手重构其他无关系统

## 实现要求
- 以“抽离与集中”为主，不做重新设计
- 优先保持运行行为稳定
- 对其他文件已经调用的函数名尽量保持兼容
- 本轮只保留一个独立入口文件
- 将 Habbo 视为当前的一种素材来源，而不是唯一未来标准

## 验收标准
- 主程序可正常打开
- prefab 列表可正常加载
- 素材刷新功能可正常工作
- Habbo 根目录状态显示正常
- Habbo 资源库相关操作不受影响
- 自定义 prefab 的 localStorage 读取不受影响
- 不引入明显新的 UI 或运行错误
- 后续开发者能明确知道应在 `src/asset-management/asset-management.js` 查找素材导入 / 索引相关逻辑
