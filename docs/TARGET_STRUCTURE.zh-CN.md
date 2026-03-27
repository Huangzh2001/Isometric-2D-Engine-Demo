# 长期目标结构建议

## 1. 文档目的

本文档描述项目的**长期目标结构**。这不是要求本轮立刻实施的结构，而是后续多轮小步重构要逐渐靠近的目标。

当前项目应坚持：

- 一次只抽一个系统
- 每轮保持行为稳定
- 每轮改完立即验证
- 不做大规模同时迁移

---

## 2. 推荐目标目录结构

```text
src/
  systems/
    scene-storage/
      scene-storage.js
    asset-management/
      asset-management.js
    logging/
      logging.js
    lighting/
      lighting.js
    player/
      player.js
    placement/
      placement.js
  core/
    state.js
    app.js
    render.js
    logic.js
  editor/
    editor-unified-v18.js
```

---

## 3. 各层含义

### 3.1 `systems/`

放置长期稳定存在、职责边界明确的业务子系统：

- `scene-storage/`：场景序列化、保存、读取、默认场景处理
- `asset-management/`：prefab 库、外部素材接入、Habbo 与未来素材来源
- `logging/`：日志与调试支持
- `lighting/`：光源、阴影、光影相关辅助逻辑
- `player/`：人物运动、碰撞相关逻辑、人物空间规则
- `placement/`：物品摆放、实例管理、排序相关空间规则

### 3.2 `core/`

放置项目级运行基础设施：

- `state.js`：全局状态与共享基础对象
- `app.js`：初始化、事件接线、主循环调度
- `render.js`：渲染主流程
- `logic.js`：数学、碰撞、遮挡、投影等共享逻辑

### 3.3 `editor/`

放置仅供素材编辑器使用的逻辑，与主程序运行时代码分离。

---

## 4. 迁移原则

向该目标结构推进时，应遵守以下原则：

1. 一次只抽离一个子系统
2. 每轮重构保持行为不变
3. 每轮结束后立即验证
4. 不进行大范围同时重命名或大搬家
5. 只有在多个子系统边界都已稳定后，再考虑更深层的目录迁移

---

## 5. 当前轮次说明

本文档描述的是**长期方向**，并不表示当前轮次要一次性改造成该结构。

当前轮次只做：

```text
src/scene-storage/scene-storage.js
```

其他系统保持不动，留待后续轮次逐步处理。

