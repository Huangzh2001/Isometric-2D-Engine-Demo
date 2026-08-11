# Shadow Projection Workbench v4.18.3 — Keyframe-Consistent Ray Transport

## 打开方式

解压后直接双击 `index.html`。入口文件自包含 CSS、核心 JavaScript 与本地测试 PNG，不需要 localhost。

## A 方法：四关键帧一致性射线传输

四个严格关键方向仍使用原来的 exact keyframe renderer，数学定义不变。

连续区间内先在真实地面 XY 坐标工作。对 endpoint exact shadow 的采样点 `q`，利用关键帧方向光关系

`q = p + z k_i`, `k_i = -d_xy/d_z`

枚举候选 `z` 并得到 `p = q - z k_i`。候选 `(p,z)` 必须：

1. 落在 footprint/support 内；
2. 对四个关键方向都满足 `p + z k_j ∈ S_j`。

这些候选只作为“可解释四关键帧的 per-point transport proxy”，不宣称恢复唯一真实 3D。

### 当前光照投影

方向光严格使用：

`q_t = p + z(-d_xy/d_z)`

点光源 `L` 严格使用：

`q_t = (L_z p - z L_xy)/(L_z-z)`

方向光的 support transport 权重乘 `4t(1-t)`，使连续解本身在四个 exact endpoint 附近收敛；点光源没有“必须等于正交关键帧”的端点约束，因此保持 0.75 的物理 transport 权重。

为了缓解四 silhouette 信息不足和细长物体的 underconstraint，endpoint exact mask 的逆向 polar rotate/scale 只作为正则项。最终只构造一个 level-set/binary shadow；不做两张 shadow 的 alpha 叠加，因此不会产生 v4.18.1 那种透明双影。

## B 方法

`Shadow Hull` 保留为独立对照方法，没有被 A 方法替换。

## 已知限制

四张 silhouette / shadow 并不能唯一确定真实 3D。A 方法是“满足四关键帧约束的 transport proxy”，不是完整的逆向 3D 重建。因此中间帧对真实几何是近似值。详见 `VALIDATION-v4.18.3.md`。
