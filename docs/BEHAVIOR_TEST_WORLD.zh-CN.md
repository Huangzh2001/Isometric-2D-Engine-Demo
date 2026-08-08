# Behavior TestWorld（主游戏复用版）

## 目标

行为页不再维护第二套简化的摆放、人物、碰撞和渲染逻辑。TestWorld 直接嵌入 `start.bat -> index.html` 的主游戏运行环境。

因此测试区中的：

- 物品摆放、删除、拖动、旋转；
- 等距渲染与相机；
- 主游戏人物；
- 人物移动、点击寻路；
- voxel / collision；

全部由主程序现有逻辑负责。

Behavior TestWorld 只增加三件事：

1. 把当前正在编辑的 Prefab 或独立素材库中的 Prefab 注入主程序 Prefab Registry；
2. Behavior 随 Prefab 始终运行；在主程序查看模式下点击已放置实例，会直接触发该素材的 `onClick` / `onInteract`；
3. `self:setState(stateId)` 将实例切换到对应 State 的图片与 voxel，并调用主程序现有碰撞重建路径。

## 使用

1. 进入 `步骤 3：编辑行为`。
2. 在 `default.lua` 中直接写脚本，例如：

```lua
function onClick()
  if self:getState() == "habbo_state_0" then
    self:setState("habbo_state_1")
  else
    self:setState("habbo_state_0")
  end
end
```

3. 向下滚动到大型 TestWorld。
4. 点击“同步当前素材”。当前 Prefab 会出现在下方真实主编辑器的素材选择中，并切到“建立物件”模式。
5. 使用主编辑器原来的摆放方式放置物品。
6. 直接点击已放置物品即可执行其行为脚本；不再存在“行为运行”开关。点击空地仍走主程序人物点击寻路。
7. 修改脚本后再次“同步当前素材”即可覆盖测试版本。

## 独立素材库

TestWorld 顶部可填写工程外素材库目录。索引出的 `.hzhmat` / Prefab JSON 点击后会被注入下方主程序，可以与当前编辑素材一起摆放并测试跨 Prefab Command。

浏览器目录选择作为无法使用服务器绝对路径时的备用入口。

## 运行时边界

当前仍是 Behavior Test Runtime 子集，并非最终完整 Lua VM。TestWorld 的场景、人物、渲染、摆放和碰撞是真实主程序；Lua 解释执行层以后应替换为正式沙盒 Lua Runtime，而不改变 TestWorld 对主程序的复用方式。
