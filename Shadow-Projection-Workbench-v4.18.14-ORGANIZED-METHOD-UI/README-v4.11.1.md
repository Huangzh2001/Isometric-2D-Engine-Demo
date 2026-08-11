# Shadow Projection Workbench v4.13.1

在 v4.11.0 的基础上，保留用户认可的 Footprint 支撑边界阴影思路，并把它扩充到所有素材。

## 关键改动
- 保留 v4.11.0 对金字塔等 shrinkwrap-square 素材的 4 视图 visible-edge footprint 估计。
- 对其余素材，不再直接退回 classic，而是自动使用 proxyW / proxyD 形成的静态矩形 footprint。
- 因此第五种方法现在对所有素材都能真正进入 support 分支，而不是很多素材看起来和经典四向完全一样。

## 为什么以前很多素材看不出区别
因为 v4.11.0 中，只有 `footprintMode === shrinkwrap-square` 或 `tile` 的素材真正有 footprint；其余素材 `currentFootprint()` 直接返回 `null`，后续 `geom.useSupport` 为假，于是实际还是走经典四向阴影。
