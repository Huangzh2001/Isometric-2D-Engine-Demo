# 自检系统（P8X）

这次加入一键自检系统，目标是把“主链是否还活着、核心边界是否还在、可迁移核心是否仍可导出”变成可重复执行的动作。

## 入口

- 浏览器内：点击“运行自检并导出报告”
- 批处理：运行 `start_self_check.bat`

## 输出

自检会生成：

1. 前端调试日志中的 `[SELF-CHECK] ...` 条目
2. 浏览器下载的 JSON 报告
3. `logs/self-check/` 下保存的 server 侧 JSON 报告

## 核心检查项

- namespace / controller / workflow / portable core 是否仍存在
- health / scene-default / prefab-index / habbo-config / summary / page
- controller 的 mode / prefab 选择链
- portable core 的快照导出与非侵入 placement 评估
