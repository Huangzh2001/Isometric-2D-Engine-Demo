# Lighting 重构任务

## 目标
将光影系统抽离到 `src/lighting/lighting.js`，集中管理光影状态、光源管理、UI 接线和渲染入口包装，在不改变行为的前提下提升结构清晰度。

## 允许的改动
- 新增 `src/lighting/lighting.js`
- 从 `state.js` 抽出光影状态与辅助函数
- 从 `ui.js` 抽出光影 UI 相关函数
- 为 `render.js` 提供光影渲染入口包装
- 更新脚本接线与文档

## 禁止的改动
- 不重写光照/阴影算法
- 不重写渲染管线
- 不改变 player / placement / scene-storage 的职责

## 验收
- 主程序可打开
- 光影开关与光源编辑正常
- 玩家/物体阴影视觉保持一致
- 场景保存/读取不受影响
