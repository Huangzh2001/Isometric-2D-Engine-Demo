# Voxel 图片方向与镜像校准 V9

## 目的

Voxel 编辑页的每个目标方向独立保存以下参数：

- `sourceFacing`：当前目标方向使用哪一个方向的图片；
- `flipX`：水平镜像；
- `flipY`：垂直镜像；
- `scale`：图片缩放；
- `offsetPx.x/y`：图片相对 voxel 锚点的偏移。

选择相邻的 `sourceFacing` 可以修正图片与长条 voxel 呈 90° 交叉的问题；`flipX` 用于修正方向正确但左右朝向相反的问题。镜像不会修改图片像素，只影响当前方向的组合预览与导出变换。

## 数据结构

```json
{
  "sprite": {
    "activeFacing": 0,
    "sourceFacing": 1,
    "flipX": true,
    "flipY": false,
    "facingTransforms": [
      {
        "facing": 0,
        "sourceFacing": 1,
        "flipX": true,
        "flipY": false,
        "scale": 1,
        "offsetPx": { "x": 0, "y": 0 }
      }
    ]
  }
}
```

旧素材没有这些字段时，默认 `sourceFacing = facing`，且不镜像。
