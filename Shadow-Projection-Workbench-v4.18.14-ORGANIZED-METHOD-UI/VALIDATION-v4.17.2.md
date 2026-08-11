# VALIDATION v4.17.2

## 基础代码测试

- `node --check app.js`：通过
- `node test_math.js`：6/6 通过
- `node test_contour_accel.js`：通过
- `node test_keyframe_pairing.js`：通过

## 连续关键帧路径静态检查

- `keyframemorph` 不再调用 `buildKeyframeGroundSdf()`；旧 ground-SDF 动态路径已从 app.js 删除。
- `keyframemorph` 输出标识：`z-axis-rotation-plus-contour-residual`。
- 相邻关键帧选择使用真实 `info.forward.xy` 方位角排序，标识：`exact-keyframe-forward-azimuth`。
- w=0/1 在轮廓构造阶段直接返回 A/B 端点，不做轮廓重采样。
- 点光源不再触发 `shadow-mode-auto`。
- UI 中 Z轴旋转轮廓和 Shadow Hull 位于同一“四关键帧连续方法”分组。

## Shadow Hull 加速正确性

对本地 assets 中 51 张 PNG 的 alpha=0.5 连续轮廓进行了随机查询对照：

- 每张图随机 1000 组点/线查询；
- accelerated point-in-contour 与 brute-force：0 mismatch；
- accelerated line/contour crossings 与 brute-force：0 mismatch；
- 51 张图平均候选边比例：约 4.70%；
- 最大约 6.4%，最小约 3.8%。

金字塔四张图每张约 395 条轮廓边：

- 20,000 条随机线段对照：0 crossing mismatch；
- 平均候选边约 18.2 / 395（约 4.6%）。

在本容器的 Node 微基准中，对金字塔同一组 50,000 条随机 source-space 线段：

- brute-force crossing：约 599 ms；
- indexed crossing：约 35.8 ms；
- 该**轮廓求交子步骤**约 16.75× 加速。

注意：这是轮廓求交子步骤的微基准，不等同于完整浏览器帧率提升倍数。

## 浏览器运行验证限制

尝试使用系统 Chromium + Playwright 打开本地 HTTP 页面时，运行环境返回：

`net::ERR_BLOCKED_BY_ADMINISTRATOR`

因此本容器无法完成真实浏览器截图/FPS 验证。没有把静态/Node 测试冒充成浏览器视觉验证。
