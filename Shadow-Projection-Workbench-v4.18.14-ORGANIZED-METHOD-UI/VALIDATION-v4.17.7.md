# VALIDATION v4.17.7

## 已完成的数学回归

`node test_field_morph_math.js`

- PASS: four directional shadow rays reconstruct the original known 3D feature point.
- PASS: point-light central projection lands exactly on z=0 continuation of the L→P line.
- PASS: Beier–Neely single-line reverse map reproduces an exact translation.
- PASS: point-light projection converges to directional projection as source distance → infinity.

Existing regressions also pass:

- `node test_math.js`
- `node test_contour_accel.js`
- `node test_keyframe_pairing.js`
- `node --check app.js`

## 浏览器运行验证状态

尝试用容器内 Chromium 直接加载本地 workbench 做 tree / point-light runtime inspection，但环境策略返回：

`127.0.0.1 is blocked — Your organization doesn’t allow you to view this site`

因此**没有宣称完成浏览器视觉验证**。

## 新日志应出现

A 方法：

- `continuousMethod: "light-driven-field-morph"`
- `projection: "beier-neely-light-driven-field-morph"`
- `featureModel: "shared-source-uv"`（tree 等单图四方向复用）
- `lightProjection: "parallel-directional-projection"` 或 `"central-point-projection"`
- `featureLines`
- `validFeatures / invalidFeatures`
- `triangulationRms`

点光源下还应出现：

- `pointLightExactFeatureProjection: true`

注意：这只表示 sparse feature 使用精确中心投影，不表示整个 shadow 是完整 3D 精确解。
