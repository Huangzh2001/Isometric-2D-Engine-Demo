# 日志系统重构任务说明

## 目标
将主程序中的日志系统抽离到 `src/infrastructure/logging/logging.js`，集中管理运行日志、路由日志、告警、错误与 fail-fast 诊断输出，在不改变现有功能行为的前提下提升代码结构清晰度与调试能力。

## 允许的改动
- 新增 `src/infrastructure/logging/logging.js`
- 将共享日志状态与通用日志函数从 `src/infrastructure/legacy/state.js` 中抽离
- 在 `index.html` 中新增最小必要的脚本引用
- 将原有调用点接到新的 logging 入口
- 在 `docs/` 下补充文档

## 禁止的改动
- 不修改 scene-storage 的职责
- 不修改 asset-management 的职责
- 不修改光影、人物、碰撞、放置、编辑器行为
- 不修改 prefab / scene 数据结构
- 不将项目改造成 ES module
- 不删除现有调试能力

## 实现要求
- 保留旧的全局函数名兼容调用，例如 `pushLog`、`detailLog`、`exportLogs`
- 保持现有日志前缀兼容，包括 route / fail-fast 前缀
- 以最小抽离为主，不做大范围清理

## 验收标准
- 主程序可正常打开
- prefab 列表正常
- Habbo library 正常
- scene save/load 不受影响
- route 日志与 fail-fast 日志不丢失
- 后续开发者能够明确知道日志职责优先在 `src/infrastructure/logging/logging.js` 中查找
