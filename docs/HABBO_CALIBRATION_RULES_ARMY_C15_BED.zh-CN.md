# army_c15_bed 校准样本结论（修订版）

样本：原始 `army_c15_bed.swf` 与人工调整后的 `army_c15_bed.hzhmat`。

## 1. 已确认的图层规则

SWF 只提供方向 0、2；部分方向通过 `flipH + source` 引用另一方向位图。

旧导入器在生成相反方向时只翻转每张位图，没有同步反射各层的空间注册位置，导致 a、b、c 分段分离。

正确处理：

1. 原生方向按 SWF `asset x/y`、source 与 flipH 组装；
2. 生成镜像方向时，以有效主体层组合边界反射每层位置；
3. 同时翻转每层位图；
4. 阴影不参与主体边界；
5. `1×1` 非阴影位图作为动画空帧忽略。

## 2. 旧“占地从下一格开始”结论已废弃

人工文件中的 voxel 绝对坐标只是编辑器摆放位置，不能推出：

```text
position tile 固定在占地外
所有 1×3 家具都沿编辑器 X 轴
占地必须从某个绝对格开始
```

现行规则：

- 保留 SWF `objectData x/y` 原始轴向；
- 按实际源方向旋转局部 footprint；
- `prefab.anchor` 保存方向相关的 position tile；
- 图片注册点对齐 position tile 中心；
- 所有样本比较先移除 voxel 的绝对编辑器平移。

详见 `HABBO_RELATIVE_REGISTRATION_RULES_MULTI_SAMPLE.zh-CN.md`。

## 3. 本样本提供的有效证据

`army_c15_bed` 的阴影中心相对图片注册点约为 `(0.008, 1.148)` 格；`1×3` footprint 以 position tile 为原点时，理论 footprint 中心为 `(0,1)` 格，误差约 `0.148` 格。

该证据支持 position-tile 注册模型，但不支持任何绝对 voxel 坐标规则。

## 4. 裁切说明

旧人工文件的部分方向曾受破坏性移动影响，边缘像素缺失不能作为注册真值。当前图层采用独立无限平面存储，移出画布不再删除像素。
