# P1 主路径收口记录

本轮目标不是新增功能，也不是重构渲染、编辑器、地形或人物系统，而是进一步降低后续 AI 误改旧路径的概率。P0 已经清理了根目录阶段性产物；P1 进一步把“哪些文件不能作为主路径”变成可见标记和可执行检查。

## 一、本轮处理范围

本轮处理了三类问题：第一，根目录 fail-fast stub 的状态被纳入检查；第二，`src/` 下 residual / non-canonical 旧文件增加头部警示；第三，源码目录中的 `.bak` 备份文件被移出源码区并归档。

本轮没有修改业务行为，没有调整 HTML 加载顺序，没有改动渲染、放置、人物移动、地形编辑器或资源协议。

## 二、归档内容

`src/logic.js.bak` 已从源码目录移到：

```text
/docs/archive/legacy-src/logic.js.bak
```

原因是 `.bak` 文件留在 `src/` 会干扰后续 AI 判断源码主路径。该文件仅作为历史备份归档，不参与运行入口。

## 三、增加的 residual 文件标记

以下文件添加了 `P1 MAIN-PATH NOTICE` 文件头。这个标记不改变运行行为，只说明这些文件不是新开发的默认 owner。

```text
src/app.js
src/render.js
src/logic.js
src/ui.js
src/state.js
src/editor-unified-v18.js
src/player/player.js
src/placement/placement.js
src/lighting/lighting.js
src/logging/logging.js
src/asset-management/asset-management.js
src/scene-storage/scene-storage.js
```

后续如果要修改这些文件，必须先证明当前入口、测试或回放仍然依赖它们；否则应优先修改四层 canonical 路径。

## 四、新增检查脚本

新增：

```text
scripts/check_main_path_refs.js
```

它检查三件事：

1. 根目录 HTML 入口是否误加载旧根目录 JS 或 `src/` 顶层旧文件；
2. 根目录 deprecated guard 是否仍然 fail-fast，并指向 canonical owner；
3. residual 文件是否保留 `P1 MAIN-PATH NOTICE`；
4. `.bak` 文件是否仍误留在源码目录。

同时，`scripts/check_project_hygiene.js` 已同步增强，纳入上述主路径检查的一部分。

## 五、验收结果

本轮已运行：

```bash
node scripts/check_project_hygiene.js
node scripts/check_main_path_refs.js
```

两个检查均返回 `PASS`。

## 六、后续建议

下一步如果继续整理，建议进入 P2：按模块建立更细的 owner contract，例如 render / player / placement / floor-editor 四个方向分别定义“允许改哪里、禁止改哪里、最小验收是什么”。不要直接删除 residual 文件，也不要一次性迁移成 ES module 或 bundler 架构。
