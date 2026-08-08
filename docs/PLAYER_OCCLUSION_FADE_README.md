# Player Occlusion Fade v1.19

本版解决“看起来变暗”的问题：

原因不是代码主动变暗。当前 fade 是 normal alpha：

```
displayObject.alpha = cfg.alpha
```

没有设置 tint，也没有使用 dark blend mode。  
但如果 alpha 太低，后面的深色侧面、阴影或背景透出来，视觉上就会像“变暗”。

v1.19 调整：

1. 默认透明度从 `0.55` 提高到 `0.75`，减少深色背景透出造成的暗感。
2. 显式保留并恢复原始 `blendMode` / `tint`，确保遮挡透明只改 alpha。
3. 日志中 `alphaNote` 会说明：`Alpha-only fade. No tint/blendMode darkening is applied.`

保留 v1.18 的遮挡规则：

```
候选 face 与黄色 player bounds 重叠
AND candidateContainerIndex > playerContainerIndex
AND 非 supportTop trigger
=> 同 group 透明
```

说明：

如果用户把 alpha 调得太低，比如 0.35~0.55，透明面后面的深色几何一定会更明显，视觉上会显暗。建议默认使用 0.70~0.85。
