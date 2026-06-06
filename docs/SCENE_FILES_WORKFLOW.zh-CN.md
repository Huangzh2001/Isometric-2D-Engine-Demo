# 多世界 / 多场景文件工作流

## 目标

不同测试目的使用不同场景文件，避免每次从零搭地图。

## 文件位置

所有场景保存在：

```text
assets/scenes/
```

每个世界一个 JSON 文件，例如：

```text
assets/scenes/small_scene.json
assets/scenes/fluid_demo_obstacle.json
assets/scenes/fluid_demo_gravity.json
assets/scenes/fluid_demo_render_order.json
```

## UI 入口

```text
世界 → 多场景文件
```

支持：

- 刷新列表
- 加载选择
- 保存当前
- 另存为新世界
- 新建空世界并保存

## 本地服务接口

新增：

```text
GET /api/scenes/index
```

用于列出 `assets/scenes/*.json`。

## 当前默认场景

```text
small_scene.json
```

默认文件记录在：

```text
assets/scenes/_default_scene.json
```
