# P3-C：高频读路径 selector / snapshot

本轮开始为主程序与编辑器提供稳定读路径：

- `App.state.selectors.getRuntimeSummary()`
- `App.state.selectors.getSelectedPrefab()`
- `App.state.selectors.getSceneSummary()`
- `App.state.selectors.getLightingSummary()`
- `App.state.selectors.buildMainSnapshot()`
- `App.state.selectors.buildEditorSnapshot()`

目标不是冻结最终数据协议，而是把高频读取从“直接深挖内部状态结构”逐步改成“通过 selector / snapshot 读取”。
