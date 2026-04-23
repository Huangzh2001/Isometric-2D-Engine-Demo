# 001_SOURCE_OF_TRUTH.md

> **Phase P1：固定唯一真实源码位置。**
>
> 任何 AI / 开发者在修改代码前，先看这个文件，再改代码。

## 当前结论

本项目在根目录曾保留过若干历史脚本副本。自 **P1** 起，这些根目录脚本不再是可编辑源码，而是 **废弃 stub**。

## 唯一真实源码位置（Source of Truth）

- 主程序入口脚本：`src/presentation/shell/app.js`
- 主程序状态承载：`src/infrastructure/legacy/state.js`
- 主程序启动装配：`src/presentation/shell/app-shell.js`
- 光影编辑逻辑：`src/presentation/lighting/lighting-editor.js`
- 后端服务入口：`server/local_server.py`

## 根目录废弃 stub（禁止编辑）

以下文件保留在根目录，只用于：

- 第一时间拦截误加载
- 第一时间提醒“你改错地方了”
- 帮助 AI / 人类快速定位真正源码

废弃 stub 列表：

- `app.js` → 真源码在 `src/presentation/shell/app.js`
- `state.js` → 真源码在 `src/infrastructure/legacy/state.js`
- `app-shell.js` → 真源码在 `src/presentation/shell/app-shell.js`
- `lighting-editor.js` → 真源码在 `src/presentation/lighting/lighting-editor.js`

## P1 之后的修改规则

- **不要编辑根目录上述 4 个 JS 文件**
- 修改主程序逻辑时，只改 `src/` 下对应文件
- 修改后端逻辑时，只改 `server/` 下对应文件
- 若运行时出现“legacy root file loaded”错误，说明某处仍在错误引用根目录旧文件，必须先修引用路径

## 当前 phase 状态

- **P0：已完成**（结构化日志基线已接入）
- **P1：已完成**（唯一真实源码位置已固定，根目录重复文件已 stub 化）

下一步进入：**P2：收口全局脚本依赖，建立统一 bootstrap / namespace**


## Backend log location

- Current run log: `logs/server/server-<role>-YYYYMMDD-HHMMSS.log`
- Latest shortcut log: `logs/server/server-<role>-latest.log`
- Default role from `start.bat` is usually `main`; editor launcher may use a different role.
