# v4.16.5 — terrain raised object shadow semantics

本版把三组水渠/坡岸 terrain 素材改成：

- **显示注册**：仍然按 `ground-tile` 放到 z=0 的地块中心；
- **阴影求解**：改为 `raised-terrain`，按抬离地面的完整立体物体投影；
- **footprint**：仍固定为 1×1 tile，但不再把阴影代理高度压成贴地薄片。

涉及分组：

- `terrain-channel-low`
- `terrain-channel-wall`
- `terrain-channel-slope`

实现上新增了 `isGroundRegisteredSpec / isRaisedTerrainShadowSpec / isShadowGroundSpec` 三个判定，把“显示是地块”和“阴影是不是贴地薄片”两个语义拆开。
