# Placement 边界说明

## Placement 负责什么
- 根据 prefab 创建场景实例。
- 删除场景实例。
- 将实例展开为 boxes。
- 在放置状态变化后重建 placement 侧的 box 状态。
- 处理预览落地提交，以及拖拽提交/取消的入口。
- 触发 placement 侧的排序刷新入口。

## Placement 不负责什么
- 物品排序算法细节本身。
- render 管线内部实现。
- 人物与物品的前后关系。
- 光影与阴影行为。
- 场景持久化。
- 资源导入与素材库索引。

## 与其他模块的边界
- `render.js`：保留预览计算、拾取与绘制。
- `logic.js`：保留空间计算与排序相关算法辅助。
- `scene-storage.js`：保留持久化与快照恢复。
- `asset-management.js`：保留资源来源与 prefab 导入职责。
- `logging.js`：保留统一日志输出与诊断。

## 为什么本轮只抽入口，不重写排序算法
placement 与 render、logic 的耦合较深。如果这一轮同时重写排序算法，风险会显著增大。因此本轮只把 placement 生命周期与排序触发入口独立出来，不强行搬动算法主体。
