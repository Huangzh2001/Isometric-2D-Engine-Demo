# STATE_OWNER_MAP.zh-CN.md

> Phase P3-B 的 owner map。当前版本已经在运行时、prefab 和 scene graph 入口上开始收口高频写路径。

| 状态类别 | owner 文件 | 主要根路径 | 当前写入口 | 备注 |
|---|---|---|---|---|
| 运行时 / 交互状态 | `src/core/state/runtime-state.js` | `App.state.runtimeState` | 模式切换、相机、鼠标、选中项都应先经过这个 owner | P3-B 优先收口 |
| Prefab 注册表 | `src/core/state/prefab-registry.js` | `App.state.prefabRegistry` | `ensurePrefabRegistered`、template lookup | 所有 prefab 注册与查询统一走这里 |
| 灯光状态 | `src/core/lighting/lighting-state.js` | `App.state.lightingState` | `applyLightingPreset`、lighting UI handlers | 只管灯光数据，不管最终渲染画法 |
| 场景实例 / 盒体 | `src/infrastructure/legacy/state.js` | `instances` / `boxes` | `applySceneSnapshot`、`placement.*`、`scene-storage.*` | 当前仍是聚合 owner，后面再抽 Session |
| DOM 注册表 | `src/presentation/shell/dom-registry.js` | `App.shell.domRegistry` | 启动绑定一次写入 | 不承载业务状态 |
| 资源浏览 / 导入会话 | `src/infrastructure/assets/asset-management.js` | 模块内缓存 | Habbo summary/page、asset scan orchestration | 当前仍有隐式模块状态 |
| 编辑器会话状态 | `src/presentation/editor/editor-unified-v18.js` | 编辑器本地 `state` | 编辑器 UI handlers | 严禁和主程序 runtime 混写 |
| 服务边界 | `src/services/*.js` + `server/local_server.py` | `App.services.*` | API methods | 不是状态 owner，但定义跨边界正式入口 |

## Owner 规则

1. **owner 负责写**：后续逐步把高频写路径收口到 owner API。
2. **非 owner 尽量只读**：P3-C 开始补 selector / snapshot。
3. **主程序状态与编辑器状态分离**：不要为了方便互相偷写。
4. **服务边界只做边界**：不要把 UI 临时状态塞进 service wrapper。

## P3-B 的仪表盘与写路径约定

主程序 / 编辑器启动时都应输出：

- `[P3][BOOT] state-owner-map-ready`
- `[P3][BOUNDARY] state-dashboard-ready`
- `[P3][SUMMARY] state-inventory`
- `[P3][SUMMARY] state-dashboard`

这些日志的目标不是“更啰嗦”，而是让后续每一步都能看出：

- 当前有哪些状态 owner
- 当前有哪些根路径已经存在
- 主程序 / 编辑器的状态边界是否混线
