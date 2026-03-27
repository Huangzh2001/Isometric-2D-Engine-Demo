# Lighting 边界说明

Lighting 负责：
- 光影状态
- 光源预设与当前激活光源
- 光影 UI 编辑辅助函数
- glow / shadow / bulb / axes 的渲染入口包装

Lighting 不负责：
- 玩家移动
- placement 生命周期
- 场景存储协议
- 仍然留在 logic.js 中的底层光照/阴影算法
