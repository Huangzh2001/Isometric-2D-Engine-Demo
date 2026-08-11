# VALIDATION v4.17.5

已通过：
- node --check app.js
- test_math.js
- test_keyframe_pairing.js
- test_contour_accel.js
- test_height_proxy_projection.js

关键回归条件：
- 72×72 高度网格的 `dx=dy=2/72` 为有限正数；
- 点光源与方向光下抽样柱体顶点均可投到 floor；
- 新日志中 floor 的 `projectedVertices` 不应再为 0；
- `projectionFailures` 不应再固定等于 41472。
