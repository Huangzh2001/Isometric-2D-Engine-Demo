# PROJECT_REFACTOR_PHASE_PLAN.zh-CN.md

> 本文档记录当前约定的 **10 个 phase 重构主线**。修改本项目时，请先阅读根目录 `000_READ_THIS_FIRST_FOR_AI.md` 与 `AGENTS.md`。

## 最终目标：四层结构

### 1. Renderer Adapter（渲染适配层）
只负责：Canvas2D / WebGL / WebGPU / 未来引擎的具体绘制、屏幕坐标、draw call、shader / blur / glow / alpha compositing、屏幕命中测试。

### 2. App / UI Controller（应用控制层）
只负责：DOM 事件、面板状态、按钮行为、编辑模式切换、把用户输入转成标准命令。

### 3. Domain Core（领域核心层）
只负责：instance / prefab / player / light 的领域模型，占地、碰撞、可通行判断、等距空间前后关系、排序 key、支撑关系、场景更新规则、阴影几何基础结果。

### 4. Asset / Scene Service（资源与场景服务层）
只负责：prefab 扫描、Habbo index、SWF 文件读取、元数据提取、scene 保存 / 读取、scene 校验、prefab 归一化、缓存与索引。

---

## Phase P0：基线与结构化日志
- 前端统一日志分类：BOOT / BOUNDARY / INVARIANT / SUMMARY
- 主程序与编辑器都能报告入口、脚本清单、边界与运行摘要
- 主程序启动期可诊断 `/api/health`、scene、prefab、habbo library
- 后端能清楚报告 routes 注册与 API 边界响应

## Phase P1：清理重复 / 残留文件
- 固定唯一真实源码位置
- 消灭“改错文件”的风险
- 不改变行为

## Phase P2：收口全局脚本依赖
- 从散乱全局过渡到统一 bootstrap / namespace
- 仍然不直接上 bundler / npm / 大现代化

## Phase P3：状态边界重构（state boundary refactor）
- P3-A：状态清单 + owner map + 状态仪表盘
- P3-B：先收口高频写路径，限制谁能改状态
- P3-C：补 selector / snapshot，减少深层直接读
- P3-D：整理 SceneSession / RuntimeSession 外壳，为 Domain Core 抽离做准备

## Phase P4：拆 `state.js`
- runtime / selection / scene / debug 分离
- Habbo 解析、import、归一化逐步离开 `state.js`

## Phase P5：抽 Domain Core I
- 占地、碰撞、可通行、放置合法性
- 形成尽量纯函数的空间规则模块

## Phase P6：抽 Domain Core II
- 排序、遮挡、前后关系
- 输出 sort key / occlusion 规则，而不是 draw call

## Phase P7：抽 Domain Core III
- 抽出阴影几何
- 不把 blur / alpha / 具体画法搬走

## Phase P8X：总收尾阶段（合并原 P8 / P9 / P10）
- 不再继续拆新层；改为一次性做收尾
- 目标包括：
  - 清理冗余 compat / fallback / 重复入口
  - 维持并验证主链回归日志
  - 输出最终交接文档与已知保留债说明

## 当前推进说明（最新）
- P4 已完成到 **P4-D**：领域规则、放置判定、排序基础已经进入 Domain Core。
- P5 已完成到 **P5-D**：Canvas2D adapter 已接管更多直接绘制执行。
- P6 已完成到 **P6-C**：asset / scene workflow 已成为 canonical orchestration entry。
- P7 已完成到 **P7-C**：UI / app orchestration 已收口到 `App.controllers.*` 与 controller-local dispatch。
- 当前进入 **P8X**：集中做 cleanup / regression / handoff。

## 当前故意保留的稳定性兼容壳
- `saveScene`
- `loadScene`
- `refreshInspectorPanels`
- editor/runtime globals
- `asset-management-ownership-check`
- `legacy-habbo-prefab-repair`
