# Step 2 说明

这一步修复并强化了两件事：

1. **让 replay 主路径真正穿过 state-actions**
   - Habbo 资源导入后选中 prefab
   - 导入后切到 place 模式
   - 主程序从编辑器返回后恢复 prefab + place 模式
   - 键盘 V/B/X 与数字键 1-7 的模式/Prefab 切换

2. **修复 replay 中的退出放置模式错误**
   - 修掉 `u is not a function`

## 这次跑完后建议重点看 logs/self-check

### 1. acceptance-*-01-baseline.json
应新增并重点关注：
- `state-actions-reset`
- `state-actions-probe.modeDispatch`
- `state-actions-probe.prefabDispatch`
- `state-actions-baseline.detail.counters.modeChangeCalls`
- `state-actions-baseline.detail.counters.prefabSelectByIdCalls`

### 2. acceptance-*-03-habbo-first-item-place.json
重点看：
- `state-actions-after-habbo-place.detail.counters.*`

目标：这里不应再全部是 0。

### 3. acceptance-*-04-editor-x5-save-return-place.json
重点看：
- 不应再出现 `exit-place-mode-warning` 中的 `u is not a function`
- 新增 `state-actions-after-editor-roundtrip`

## 服务器日志中可辅助搜索的关键词
- `state-action:selectPrefabById`
- `state-action:requestModeChange`
