# P2：src 四层收口记录（已被 P2b 修正）

> 本文档保留为历史记录。P2 的初始处理方式是把旧 `src` 顶层源码副本整体移到 `src/infrastructure/legacy/top-src/`。该做法只能隔离污染源，不能真正完成 `AGENTS.md` 要求的职责归位。
>
> P2b 已修正该问题：`src/infrastructure/legacy/top-src/` 已删除；旧路径职责已经按四层 owner 重新登记，并开始进行实际拆分。请以后优先阅读：
>
> - `docs/P2B_REAL_LAYER_REALIGNMENT.zh-CN.md`
> - `docs/CANONICAL_OWNER_MAP.zh-CN.md`

## 一、P2 的问题

P2 达成了一个表面目标：`src/` 顶层只剩四个目录。

```text
src/
  application/
  core/
  infrastructure/
  presentation/
```

但当时把旧源码整体放进：

```text
src/infrastructure/legacy/top-src/
```

这属于结构隔离，不属于职责拆分。

## 二、P2b 的修正

P2b 已经删除 `src/infrastructure/legacy/top-src/`，并将旧路径职责重新归位到：

```text
src/presentation/
src/application/
src/core/
src/infrastructure/
```

同时新增首个实际拆分文件：

```text
src/core/domain/spatial-geometry-core.js
```

该文件从 `src/presentation/render/render.js` 中迁出纯几何/命中/包围盒/占用表工具。

## 三、后续判断标准

以后不能把“移动到 legacy”当成整理完成。正确标准是：

1. 旧路径不再保留源码副本；
2. 每类职责有明确四层 owner；
3. 跨层大文件逐步拆分；
4. 检查脚本阻止旧 top-src 目录复活。
