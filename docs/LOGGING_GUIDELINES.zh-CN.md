# 日志规范说明

## 日志分类
- 普通运行日志：记录用户操作、状态变化、流程进度
- 路由日志：用于证明某个模块的真实调用路径，例如 `[route][asset-management] ...`
- 告警/错误日志：记录可恢复问题或直接失败
- Fail-fast 日志：用于硬性诊断，例如 `[LEGACY-ASSET-PATH-CALLED] ...`
- 详细调试日志：用于排查问题时的 verbose 输出

## 推荐入口
后续新增日志时，优先使用 `src/logging/logging.js` 中的统一入口：
- `pushLog(...)`
- `detailLog(...)`
- `logWarn(...)`
- `logError(...)`
- `logRoute(scope, event, payload?)`
- `logFailFast(tag, message, extra?)`

## 前缀规范
- route 日志应保留模块范围前缀
- fail-fast 日志应使用稳定的大写方括号标签
- 导出日志时应保留入口元信息头部

## 接入原则
后续抽离新的系统模块时，优先把诊断输出接入 `logging.js`，避免继续新增零散的 console 输出。
