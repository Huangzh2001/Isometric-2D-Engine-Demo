# 地板编辑器边界（v2）

本入口只负责多层 floor plan 的编辑，不负责物品放置。

## 当前边界

- 负责编辑 floor plan：
  - 每一层 level 的地板格存在性
  - 每一格是否可放置
  - 每一条墙边的独立墙高
  - 矩形 / 异形边界
  - 房间层数与当前活动层
- 表现层负责：
  - UI、Canvas、滚轮切层、相邻层预览、2D 重叠小视图
- 应用层负责：
  - 工具动作编排、矩形/填充、切层、加减层、导入导出
- 核心层负责：
  - floorPlan 协议、levels 数据结构、单墙高规则、纯数据变换
- 基础设施层负责：
  - localStorage 自动存档、JSON 导入导出

## 当前不负责

- 物品放置判定接入主程序
- floor plan 与 placement / player / scene graph 联动
- 自动生成房间 runtime adapter

## 当前 residual / 遗留

- floor editor 仍是独立入口，不是主程序的一部分
- 主程序 placement 还未消费 floorPlan/v2
