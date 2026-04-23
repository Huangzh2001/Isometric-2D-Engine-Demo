# STATE_INVENTORY.zh-CN.md

> Phase P3-B 的状态清单。当前版本在保留 P3-A inventory 的基础上，继续补充高频写路径 owner API。

## 1. 主程序运行时状态

### 1.1 runtime / interaction state
- **owner**：`src/core/state/runtime-state.js`
- **根路径**：`App.state.runtimeState`
- **主要键**：`debugState`、`shadowProbeState`、`keys`、`mouse`、`camera`、`settings`、`player`、`editor`、`inspectorState`
- **说明**：主程序里最核心的交互与模式状态容器。后续 P3-B 优先把对 `editor`、`camera`、`inspectorState` 的写入收口到 owner API。

### 1.2 prefab registry
- **owner**：`src/core/state/prefab-registry.js`
- **根路径**：`App.state.prefabRegistry`
- **主要键/能力**：`prototypes`、`normalizePrefab`、`ensurePrefabRegistered`、`getPrefabById`、`prefabVariant`
- **说明**：所有 prefab 模板注册、查询、旋转变体都从这里走。

### 1.3 lighting state
- **owner**：`src/core/lighting/lighting-state.js`
- **根路径**：`App.state.lightingState`
- **主要键**：`lights`、`lightState`、`activeLightId`
- **说明**：灯光数据 owner。最终阴影几何规则会在更后面的 phase 抽离，这里先保持灯光数据 owner 清晰。

### 1.4 scene graph / scene session
- **owner**：`src/infrastructure/legacy/state.js`
- **当前承载对象**：`instances`、`boxes`
- **相关读写入口**：`applySceneSnapshot`、`saveScene`、`loadScene`、`scene-storage.*`、`placement.*`
- **说明**：当前仍是聚合层；P3-D 会进一步整理成更清晰的 `SceneSession / RuntimeSession` 壳层。

### 1.5 DOM registry
- **owner**：`src/presentation/shell/dom-registry.js`
- **根路径**：`App.shell.domRegistry`
- **主要键**：`canvas`、`ctx`、`ui.*`
- **说明**：这里只缓存 DOM 引用，不承载业务状态。

### 1.6 asset / browser session
- **owner**：`src/infrastructure/assets/asset-management.js`
- **当前形态**：模块内缓存与请求编排状态
- **主要内容**：Habbo summary/page cache、asset scan in-flight 状态、library query 复用状态
- **说明**：这是 P3-B / P3-C 的重点，因为它现在仍有较多模块内隐式状态。

## 2. 编辑器独立状态

### 2.1 editor session
- **owner**：`src/presentation/editor/editor-unified-v18.js`
- **主要键**：`id`、`name`、`renderMode`、`interactionMode`、`sprite`、`spriteFit`、`anchor`、`gridW`、`gridH`、`currentLayer`、`voxels`、`tool`、`selection`、`sidebarStep`
- **说明**：编辑器状态应与主程序运行时状态严格分离。

## 3. 服务边界（不是状态容器，但定义了状态边界入口）

### 3.1 service boundary
- **owner**：`src/services/*.js` + `server/local_server.py`
- **根路径**：`App.services.sceneApi / prefabApi / habboApi / assetApi`
- **说明**：这不是业务状态 owner，但它定义了 scene / prefab / habbo 读写跨边界的正式入口。

## 4. P3-B 之后的直接动作

- **P3-B**：先收口高频写路径，减少直接写共享状态。
- **P3-C**：补 selector / snapshot，减少深挖内部结构的直接读。
- **P3-D**：把主程序运行时状态整理成 `SceneSession / RuntimeSession` 的壳层。
