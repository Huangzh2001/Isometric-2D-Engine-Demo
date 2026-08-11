# VALIDATION v4.17.4

- `node --check app.js`: PASS
- `node test_math.js`: 6/6 PASS
- v4.17.3 日志根因：proxy 非空，但旧逐层 renderer 结果为 0。
- v4.17.4 连续方法 A 改成直接投影 H(x,y) 垂直柱体。
- 新日志应看到 `projection: keyframe-height-column-proxy`，并新增：
  - `cells`
  - `polys`
  - `projectedVertices`
  - `projectionFailures`
  - `computeMs`
- 地面上只要 footprint 内存在单元，`cells` 就不应再是 0。
