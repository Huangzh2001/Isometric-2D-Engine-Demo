# v4.16.1 — Keyframe Shadow Hull sign fix

修复 v4.16.0 中 Shadow Hull 的核心方向符号错误。

## Bug

v4.16.0 将一个 3D 点 `P` 沿关键帧光线投回地面时写成：

`G = P - d * (P.z / -d.z)`

但 `d` 本身已经是从光源向地面的向下射线，因此正确的落地点应该是：

`G = P + d * (P.z / -d.z)`

旧公式把关键帧约束反向挤出了错误方向。结果是 Shadow Hull 在 z=0 附近仍有少量命中，但大部分命中区域落在物体自身底下，所以视觉上几乎看不到真正向外延伸的投影阴影。

## Additional fix

- Shadow Hull 现在限制在 caster 的实际垂直范围 `[caster.z, caster.z + proxyH]` 附近。
- caster 抬高时，ray tracing 的最大高度会跟随 `caster.z + proxyH`，避免旧版抬高后 `spriteHits=0`。
