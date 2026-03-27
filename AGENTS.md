# AGENTS.md

> 本文件是本项目的**首要工程约束文档**。任何 AI 或开发者在修改代码前，都应先阅读本文件，再阅读 `docs/ARCHITECTURE.zh-CN.md`。

## 1. 项目目标

这是一个 **纯 HTML / CSS / JavaScript + Python 本地服务** 的等距房间编辑与展示项目。

项目由两个入口组成：

- **主程序**：`index.html`
- **素材编辑器**：`START_V18_ONLY.html`

项目的核心原则不是“追求最新框架”，而是：

- 保持当前可运行结构稳定
- 小步重构
- 行为不变优先
- 不为了“更现代”而重写
- 不在没有明确授权时改动模块边界

---

## 2. 根目录与入口约定

根目录面向人类使用者，必须保持简洁。

### 根目录保留的主要入口

- `start.bat`：启动主程序
- `start_editor.bat`：启动素材编辑器
- `index.html`：主程序页面入口
- `START_V18_ONLY.html`：编辑器页面入口
- `README.md`：面向人类的项目简介
- `AGENTS.md`：面向 AI / 自动化代理的工程约束

### 目录约定

- `src/`：主程序与编辑器脚本
- `assets/`：项目资源
- `styles/`：CSS
- `server/`：本地服务脚本
- `config/`：配置文件
- `logs/`：运行日志
- `docs/`：技术文档

### 路径修改规则

如果移动以下任何文件或目录，必须**同步修改所有相关路径**：

- `server/local_server.py`
- `server/run_server.bat`
- `start.bat`
- `start_editor.bat`
- `index.html`
- `START_V18_ONLY.html`
- `styles/`
- `config/`

禁止只移动文件而不修正引用路径。

---

## 3. 当前模块边界（必须遵守）

### 已抽离模块

- `src/scene-storage/scene-storage.js`
  - 负责 scene 保存、加载、默认 scene、持久化入口

- `src/asset-management/asset-management.js`
  - 负责 prefab 扫描、资源索引、Habbo 资源读取与资源接入入口

- `src/logging/logging.js`
  - 负责日志输出、route 日志、fail-fast 辅助与日志导出

- `src/placement/placement.js`
  - 负责物品放置、实例创建/删除、placement 入口与排序刷新入口

- `src/player/player.js`
  - 负责人物移动、输入到位移转换、边界与物体碰撞入口

- `src/lighting/lighting.js`
  - 负责光影开关、光源状态、lighting UI 绑定入口、阴影/光照入口包装

### 仍作为核心承载层的文件

- `src/state.js`
  - 全局状态、共享数据、初始化依赖
  - **不要再把已抽离模块的实现体塞回这里**

- `src/ui.js`
  - UI 面板与控件接线

- `src/logic.js`
  - 通用几何、数学、底层算法

- `src/render.js`
  - 渲染流程、绘制链路

- `src/app.js`
  - 主启动流程、初始化、主循环

### 严禁做的事

- 不要把已经抽离出去的模块实现重新复制回 `state.js / ui.js / render.js / logic.js`
- 不要制造同名函数的双份定义
- 不要在一个文件里保留“旧实现 + 新实现”两套逻辑
- 不要擅自把项目改成 ES module / import-export 架构
- 不要引入 npm / bundler / 第三方构建链

---

## 4. 修改代码前必须遵守的流程

### 第一步：先定位，再修改

任何改动前，先明确：

1. 这个问题属于哪个模块
2. 当前实现体在哪个文件
3. 是否已经有独立模块承载这项职责

如果该职责已经在独立模块中，**优先修改独立模块**，不要回到旧位置乱改。

### 第二步：只做一轮一个主题

一次修改只允许有一个明确主题，例如：

- scene-storage 修复
- asset-management 修复
- placement 收尾
- player ownership 校验
- lighting UI 绑定修复

禁止在一次改动里顺手大范围改多个模块。

### 第三步：行为不变优先

除非用户明确要求改功能，否则默认目标是：

- 修 bug
- 调整边界
- 提高清晰度
- **不改变已有行为**

### 第四步：改完必须验证

至少验证与本轮相关的最小路径。

---

## 5. 本项目的非协商规则

### 5.1 不要大改脚本加载顺序

本项目依赖多个 `<script>` 按顺序加载。修改 `index.html` 或 `START_V18_ONLY.html` 时：

- 只做最小必要调整
- 不要随意重排所有脚本
- 不要凭感觉把脚本“整理”到新顺序

### 5.2 不要重写算法，除非被明确要求

尤其是：

- 光照算法
- 阴影算法
- 人物遮挡/排序算法
- 物品排序算法
- Habbo 资源解析逻辑

默认只允许：

- 抽入口
- 包装调用
- 修绑定
- 修共享工具函数

### 5.3 不要改数据协议

没有明确授权时，禁止修改：

- prefab 数据结构
- scene 数据结构
- API 路径
- 关键字段名

### 5.4 不要引入路径回归

凡是移动文件、重命名文件、调整目录结构，必须同步检查：

- bat 启动脚本
- HTML 的 script / link 引用
- Python 服务端的资源根路径
- 配置文件路径
- 日志输出路径

---

## 6. 共享工具函数规则

本项目中一些工具函数会被多个模块共用，例如：

- `clamp(...)`
- 数值格式化小工具
- 颜色/几何辅助函数

### 规则

- 共享工具函数**不能在重构时悄悄删掉**
- 如果迁移，必须保证所有旧调用路径仍能访问
- 任何“只是个小函数，删了应该没事”的改动，都必须先全局搜索调用点

---

## 7. 关于 fail-fast / ownership

对于已经独立出来的模块，优先采用：

- owner 标记
- 启动期 ownership 校验
- fail-fast 报警

如果某模块已有类似：

- `[LEGACY-ASSET-PATH-CALLED]`
- `[LEGACY-PLACEMENT-PATH-CALLED]`

则禁止删除这些校验，除非用户明确要求取消。

对于后续收尾，优先做：

- ownership 补齐
- 旧实现清理
- 路由日志补齐

而不是再开新战线重写功能。

---

## 8. 当前推荐的维护策略

本项目当前阶段应以**收尾和稳固**为主，而不是继续大拆：

优先级建议：

1. 修具体回归 bug
2. 补充 fail-fast / ownership
3. 清理重复定义
4. 清理重复轮询 / 重复日志
5. 收拢共享工具函数
6. 补文档

不建议继续做大规模新架构改造。

---

## 9. 修改后必须检查的最小清单

每次改动后，至少验证与改动主题相关的路径。

### 通用最小检查

- 主程序可打开
- 编辑器可打开
- 日志可导出
- 无新的启动期 ReferenceError / TypeError

### scene-storage 相关

- scene 可保存
- scene 可加载

### asset-management 相关

- prefab 列表正常
- Habbo library 正常
- 自制 prefab 正常

### placement 相关

- 能放置物品
- 能拖拽物品
- 能删除物品

### player 相关

- 人物能移动
- 人物撞边界正常
- 人物撞物体正常

### lighting 相关

- 光影开关正常
- 光源参数能修改
- 阴影/光照仍渲染

---

## 10. AI 修改代码时的输出要求

任何 AI 在修改本项目时，输出中应至少说明：

1. 修改了哪些文件
2. 每个文件改了什么
3. 哪些模块被影响
4. 需要手动验证的最小步骤
5. 是否移动了文件路径
6. 是否涉及 ownership / fail-fast / 路由日志

如果做不到这一点，就说明改动不够可控。

---

## 11. 建议优先阅读的文档

在修改代码前，优先阅读：

1. `AGENTS.md`
2. `docs/ARCHITECTURE.zh-CN.md`
3. 与当前模块对应的文档，例如：
   - `docs/PLACEMENT_BOUNDARY.zh-CN.md`
   - `docs/PLAYER_BOUNDARY.zh-CN.md`
   - `docs/LIGHTING_BOUNDARY.zh-CN.md`

---

## 12. 最重要的一句话

> **先判断“这段职责现在应该归谁”，再动代码。**
>
> 如果职责已经抽到了独立模块，就不要回到旧位置乱改。
>
> 如果只是修 bug，优先修接线、修绑定、修共享工具、修入口，不要重写算法。
