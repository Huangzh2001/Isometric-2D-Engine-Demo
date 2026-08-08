# Habbo 多样本：图片—voxel 注册规则 v2

样本：`army_c15_bed`、`bed_silo_two`、`bling_bed`、`val11_present`、`shelves_silo` 的原始 SWF 与人工近似校准 `.hzhmat`。

人工校准是目测参考，不作为逐像素真值。规则优先级为：SWF 原始元数据与层注册关系 > 可验证的阴影/占地几何 > 人工校准趋势 > 单素材覆盖。

## 1. 绝对编辑器坐标不是规则

voxel 在编辑网格中放在 `(0,0)`、`(4,3)` 或其他位置，只是编辑操作。比较样本时必须同时移除：

1. 底层 voxel 的 `minX/minY`；
2. `anchor` 的同一平移；
3. 该平移在四方向等距投影中的屏幕位移。

因此保存的是局部 voxel 形状、局部定位格和图片注册点之间的关系。

## 2. `objectData x/y` 轴不能强制排序

旧规则把较长边强制设为 X，导致 `1×3`、`2×3` 等素材失去 SWF 原始朝向。

新规则：

1. 读取当前选中可视尺寸的原生方向；
2. 以第一个实际使用的源方向为编辑器方向 0；
3. 按该源方向旋转 `objectData x/y`；
4. 同时旋转 Habbo 定位格；
5. 不再执行 `max(x,y) / min(x,y)` 排序。

## 3. 图片注册点对应“方向相关定位格中心”，不是 footprint 中心

Habbo 图片层的坐标以 position tile 为注册原点。编辑器导入后：

- `prefab.anchor` 保存 position tile 在局部 footprint 中的格坐标；
- 图片注册点应对齐该格的中心；
- 多格 footprint 的几何中心不再作为默认注册点。

方向旋转后的定位格：

```text
q0: (ax, ay)
q1: (ay, w - 1 - ax)
q2: (w - 1 - ax, d - 1 - ay)
q3: (d - 1 - ay, ax)
```

其中原始 position tile 默认为 `(0,0)`。

## 4. 编辑器偏移不能重复计算定位格

编辑器和主程序的普通 sprite 渲染路径已经先投影 `prefab.anchor`。因此每方向图片偏移中只能再加入“格内中心向量” `(0.5,0.5)`，不能再次加入 `anchorCell`。

旧错误：

```text
投影 anchorCell + 偏移中再次投影 (anchorCell + 0.5)
```

新规则：

```text
投影 anchorCell + 偏移中只投影格内 (0.5,0.5)
```

这解释了为什么旧版 `1×1` 大致正常，而定位格不在局部 `(0,0)` 的多格物体会出现整格级误差。

## 5. 方向列表以当前可视尺寸为准

`bling_bed` 在目标尺寸 64 的有效方向为 `[2,4]`，但全局 XML 中还混有方向 0 的小尺寸/占位资源。旧版合并所有方向后会选择错误图像。

新优先级：

1. 当前选中 visualization size 的 directions；
2. 同尺寸 asset 的方向；
3. 全局方向；
4. 最后才回退到方向 0。

## 6. 人工校准的用途

人工文件用于：

- 发现镜像图层空间位置错误；
- 发现 x/y 轴被错误排序；
- 检查自动结果是否落在合理范围；
- 保存某个素材的逐方向覆盖。

人工文件不用于：

- 学习 voxel 在编辑网格中的绝对位置；
- 推出所有同尺寸家具固定偏移；
- 用单个床的目测值覆盖通用规则。

## 7. 新规则标识

- footprint：`habbo-position-tile-footprint-registration-v3`
- image registration：`habbo-position-tile-registration-v3-no-double-anchor`
- calibration export：`translation-invariant-registration-point-alignment-v2`
- layer storage：`rle-rgba-v2-unbounded-surface`

## 8. 回退机制

- 有有效 SWF 方向和 dimensions：使用 position-tile 规则；
- 有阴影或其他几何证据：记录验证误差与置信度；
- 无验证层：仍使用 position-tile 约定，但标记为元数据推断；
- 人工逐方向 transform：始终作为素材级覆盖，优先于自动默认值。
