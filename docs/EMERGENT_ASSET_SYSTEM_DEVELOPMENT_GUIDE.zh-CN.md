# 涌现式素材系统开发手册

版本：`2026-08-07-draft-v2`

> **重要架构参考。** 本文描述项目未来“涌现式素材系统（Emergent Asset System）”的目标架构与开发边界。
>
> 本文同时区分“已实现编辑能力”和“目标运行时”。当前项目已经具备统一素材编辑器、多状态 artwork、逐状态 voxel、四方向素材、Habbo 多状态导入，以及 Behavior 编辑页第一版（Lua 文本、公开 Commands / Events、Capabilities 声明、Prefab 素材库接口搜索与点击插入、Gameplay API 代码片段）。Material / Component 的真实运行机制、Lua Behavior Runtime、Gameplay API 执行层和世界模拟系统仍属于后续目标。

---

## 1. 目标

本项目的素材不应只是“图片 + 碰撞体”。长期目标是让每个 Prefab 成为一个**自包含、可组合、可运行的世界对象定义**：

```text
Prefab
=
美术表现
+ 空间结构
+ 状态与动画
+ 材料性质
+ 通用能力
+ 属性
+ 对外接口
+ 默认行为代码
```

大量 Prefab 被放入同一世界以后，应主要通过少量普适世界规则、标准接口、事件和消息发生作用，使复杂结果由局部规则组合产生，而不是由一个中央管理器预先枚举所有组合。

这就是本文所说的“涌现式素材系统”。

---

## 2. 核心原则

### 2.1 世界只定义少量普适规律

引擎核心应尽量只理解少量通用语义，例如：

```text
Temperature
Mass
Force
Damage
Power
Signal
Light
Collision
Inventory
Actor / Need
State
Message
```

引擎不应通过大型 `if object.type === ...` 分支理解所有具体家具。

### 2.2 允许局部关系涌现出运行时聚合对象

去中心化不等于“禁止任何聚合对象”。多个 Prefab 实例可以仅依据局部连接关系，在运行时自动形成更高层级的临时对象，例如：

```text
Wire + Wire + Generator + Consumer
                    ↓
                  Circuit

Pipe + Pipe + Pump
        ↓
   FluidNetwork
```

原则是：

- Prefab 只声明自己如何参与连接、容量、端口和局部响应；
- `Circuit` / `Network` 不是素材库里预先摆好的中央管理器，而是连通关系变化时自动创建、合并或分裂的运行时对象；
- 拓扑不变时复用聚合状态，避免每帧让所有线段互相扫描；
- 聚合对象只理解标准接口，不理解“灯”“电梯”等具体物品类型。

例如第一根电线可以创建一个 `Circuit`；新电线若连接已有线路则加入其 `Circuit`；连接两个电网时合并；断线时只重新检查受影响的原 Circuit。这样同时保留涌现性和性能。

### 2.2 Prefab 自己携带局部规则

具体物品通过 Material、Component / Capability 和少量自定义 Behavior 表达自身特性。

例如：

```text
WoodenBed
=
Wood
+ Damageable
+ Flammable
+ Movable
+ Sleepable
+ Bed-specific Behavior
```

### 2.3 组合优先，不建立庞大的继承树

不要设计：

```text
WoodenBed extends WoodenBlock extends FlammableObject ...
```

更推荐：

```text
WoodenBed has Material(Wood)
WoodenBed has Damageable
WoodenBed has Flammable
WoodenBed has Sleepable
```

原因是一个物品可能同时具备很多正交能力，多重继承会迅速变得难以维护；组合更适合涌现系统。

### 2.4 Prefab 写“可复用规则”，Scene 绑定“具体关系”

Prefab 行为可以影响自己、其他对象、人物、场景和游戏系统，但不应长期硬编码某个具体场景实例。

例如按钮 Prefab 可以写：

```lua
function onClick(ctx)
    self:setState("pressed")
    self.refs.target:send("activate")
end
```

但不应写死：

```lua
world:getById("elevator_17392"):activate()
```

`self.refs.target` 在 Scene 中绑定到具体实例，因此同一个按钮 Prefab 可以在不同房间控制门、电梯、灯或其他对象。

### 2.5 Lua 是扩展层，不是所有规则的唯一来源

优先顺序应是：

```text
世界基础规则
→ Material / Component / Capability
→ 声明式接口与事件
→ 最后才使用 Prefab 自定义 Lua
```

能由 `Flammable`、`Damageable`、`PowerConsumer` 等通用能力表达的规则，不应在每个 Prefab 的 Lua 中重复实现。

---

## 3. 三个必须严格区分的概念

### 3.1 Material：这个东西“由什么构成”

例如：

```text
Wood
Iron
Glass
Cloth
Stone
```

Material 可以提供基础物性：

```text
密度
硬度
燃点
导热率
可燃性
耐热性
破坏后的产物
```

**木床不应继承“木头块 Prefab”。**

正确关系是：

```text
WoodBlock uses Wood
WoodenBed uses Wood
WoodenDoor uses Wood
```

以后可以进一步支持一个 Prefab 含多个材料区域：

```text
Bed
├── frame    -> Wood
├── mattress -> Cloth
└── fittings -> Iron
```

这允许火、热、破坏等规则基于材料自然组合。

### 3.2 Component / Capability：这个东西“具有什么通用能力”

例如：

```text
Damageable
Flammable
Movable
Openable
Container
Sleepable
PowerSource
PowerConsumer
SignalEmitter
SignalReceiver
Light
Seat
DamageDealer
```

每个能力应有明确的数据和标准接口。

例如：

```text
Flammable
├── ignitionTemperature
├── burnRate
├── heatOutput
└── combustionProducts
```

```text
Damageable
├── durability
├── resistances
└── damage(amount, type)
```

### 3.3 Prefab Behavior：这个具体物品“有什么特殊行为”

无法由通用能力直接表达的规则，才放在 Prefab 自定义 Behavior 中。

例如床可以在早期直接实现 `sleep(actor)`；如果以后发现床、睡袋、沙发等都需要同类行为，再把它抽象成 `Sleepable` 通用能力。

---

## 4. Prefab 的目标数据结构

建议长期目标结构如下：

```text
Prefab
├── Identity
│   ├── id
│   ├── name
│   └── category
│
├── Visual
│   └── State
│       └── Facing
│           └── Animation
│               └── Frame
│                   └── Layers
│
├── Spatial
│   └── State
│       ├── Voxel
│       ├── Collision
│       ├── Anchor
│       └── Walkable / Blocking
│
├── Materials
├── Components / Capabilities
├── Properties
├── References
├── Commands
├── Events
└── Behavior
    └── Lua
```

### 4.1 State 与 Frame 不得混淆

```text
State != Frame
```

例如一扇门：

```text
closed
opening
open
closing
```

其中 `opening` 可以包含 16 个动画帧：

```text
opening
└── animation
    ├── frame 0
    ├── frame 1
    ├── ...
    └── frame 15
```

16 帧动画不是 16 个 State。

### 4.2 当前项目基础

当前素材编辑器已经使用并保存：

```text
state
└── facing
    └── layers
```

同时每个 state 已可保存独立 voxel 与四方向图片变换。动画 `Animation -> Frame` 层应在真正加入帧动画编辑时再扩展，不要把帧伪装成 state。

---

## 5. 一个物品的行为可以影响什么

Prefab Behavior 绝不能被限制为“只能修改自己”。运行时应允许它通过受控 Gameplay API 作用于五类对象：

```text
self        当前物品
refs        Scene 绑定的其他对象
actor       触发事件的人物
scene       当前场景
world/game  世界与公开游戏系统
```

例如经验宝箱：

```lua
function onInteract(ctx)
    if self:getState() == "opened" then
        return
    end

    self:setState("opened")
    ctx.actor:addExperience(self.experienceReward)

    if self.refs.unlockTarget then
        self.refs.unlockTarget:send("unlock")
    end

    scene:setFlag("treasure_found", true)
    self:emit("opened")
end
```

这里同时发生：

1. 改变自己；
2. 改变人物；
3. 改变另一个物品；
4. 改变场景；
5. 发出事件供其他对象响应。

---

## 6. Properties / References / Commands / Events

这是 Prefab 可复用性的核心。

### 6.1 Properties：可配置参数

例如：

```text
Bed
comfort = 0.8
sleepRecovery = 10
```

```text
Lamp
brightness = 1.0
color = #ffffff
```

### 6.2 References：外部对象插槽

Prefab 可以声明：

```text
target : Openable
powerSource : PowerSource
unlockTarget : optional Interactable
```

Prefab 代码使用：

```lua
self.refs.target:open()
```

具体 `target` 是哪个实例，由主游戏 Scene 编辑器绑定。

### 6.3 Commands：别人可以要求我做什么

例如门：

```text
open()
close()
lock()
unlock()
```

电梯：

```text
goToFloor(floor)
openDoor()
closeDoor()
```

### 6.4 Events：我会向世界宣布什么

例如：

```text
opened
closed
arrived
pressed
burnStarted
destroyed
```

Scene Logic 可以连接：

```text
Button_A.pressed
→ Elevator_A.goToFloor(3)
```

这使 Prefab 不需要知道最终由谁响应。

---

## 7. 素材库中的其他 Prefab 与游戏公共 API

### 7.1 允许引用“类型/接口”，不要默认写死具体实例

素材编辑器中的代码可以声明依赖接口：

```text
Openable
PowerConsumer
Damageable
```

然后通过 `References` 使用。

### 7.2 允许按 Prefab ID 生成新物品

“生成一种东西”和“控制已有具体实例”是两种不同语义。

合理：

```lua
world:spawnPrefab("coin_gold", self.position)
```

因为这是创造某一类对象。

### 7.3 游戏系统通过公开 API 暴露

例如：

```lua
game.economy:addGold(actor, 10)
game.progression:addExperience(actor, 100)
game.inventory:add(actor, "apple", 1)
game.quest:setFlag("found_key", true)
```

未来可以扩展：

```text
game.audio
game.weather
game.time
game.dialogue
game.camera
game.combat
game.ai
```

Lua 只能调用公开 Gameplay API，不直接访问内部 store、renderer、DOM、缓存或文件系统。

---

## 8. 脚本语言与声明格式

### 8.1 引擎

继续使用：

```text
TypeScript / JavaScript
```

高频系统、渲染、运动、寻路、物理、网络与数据存储由引擎实现。

### 8.2 Prefab 声明

使用 JSON / JSON5 风格的声明式 Schema，而不是 Python 或 Lua 代码声明基础结构。

声明内容包括：

```text
states
animations
materials
components
properties
references
commands
events
capabilities
```

### 8.3 Prefab 自定义行为

目标脚本语言：

```text
Lua
```

原因：轻量、适合嵌入、沙盒边界清楚，适合作为创作者脚本层。

### 8.4 Python 的定位

Python 更适合作为：

```text
编辑器自动化
批量素材处理
离线世界生成
分析工具
AI / 内容生成辅助
开发脚本
```

不建议作为浏览器主游戏中每个物品的默认实时脚本语言。

---

## 9. 性能原则

“每个 Prefab 携带行为代码”本身不是主要性能问题。真正的风险是**运行频率和实例调度方式**。

### 9.1 代码按 Prefab 共享，不按实例重复编译

例如场景里有 1000 盏同一种灯：

```text
Lamp Prefab Lua
→ 编译一次
→ 1000 个实例共享代码
```

实例只保存自己的状态：

```text
Lamp_1.state = off
Lamp_2.state = on
Lamp_3.state = broken
```

### 9.2 默认事件驱动，默认休眠

普通对象没有事件时不执行 Lua。

```text
sleep
↓ click / collision / message / timer
wake
↓ run handler
sleep
```

建议基础事件：

```text
onStart
onInteract
onClick
onCollisionEnter
onCollisionExit
onMessage
onStateChanged
onTimer
```

### 9.3 禁止所有对象默认 onUpdate

不要让几千个对象每帧运行脚本。

真正需要连续更新的能力必须显式 opt-in，并尽量委托给引擎系统。

错误：

```lua
function onUpdate(dt)
    self.y = self.y + speed * dt
end
```

推荐：

```lua
self.motion:moveTo(target, speed)
```

然后底层 TypeScript 运动系统执行高频更新，完成后只向 Lua 发：

```text
onMoveFinished
```

原则：

> **Lua 负责决策；引擎负责高频执行。**

### 9.4 Dirty / Event-driven 更新

只有状态真正变化时才标记：

```text
render dirty
collision dirty
lighting dirty
pathfinding dirty
```

不要因为一个 Prefab 带有 Behavior 就让它每帧触发所有子系统。

### 9.5 运行时应设置预算

未来 Lua Runtime 建议提供：

- 单事件最大指令/时间预算；
- 单帧脚本总预算；
- 定时器数量限制；
- 消息递归/传播深度限制；
- 无限循环中断；
- 脚本错误隔离；
- 对昂贵 API 的限流。

---

## 10. 消息与事件总线

对象之间不要直接依赖彼此内部数据。

推荐：

```text
Button
→ emit("pressed")

Scene wiring
→ Elevator.goToFloor(3)
```

或：

```text
Button
→ self.refs.target:send("activate")
```

世界级广播也应通过受控 Event / Message Bus：

```text
broadcast("power_off")
```

监听者自行决定如何响应。

禁止形成：

```text
A 直接改 B 内部字段
B 直接改 C renderer
C 再写 A private cache
```

---

## 11. 什么才算真正的涌现

### 11.1 不是涌现：预先编排全部结果

```text
点击按钮 A
→ 打开门 B
```

这是合法功能，但本质上是明确编排。

### 11.2 更强的涌现：通用性质组合

例如：

```text
Box
→ Weight = 10

PressurePlate
→ 检测重量
→ 输出 Signal

Door
→ 收到 Signal 且未锁定
→ Open
```

结果：

```text
箱子压住压力板
→ Signal
→ 门打开
```

没有专门写“箱子 + 这块压力板 + 这扇门”的特殊代码。

### 11.3 更深一层：世界基础量参与组合

例如：

```text
Wood -> Flammable
Fire -> Heat
Wire -> Damageable + PowerConductor
Elevator -> PowerConsumer
```

于是可能自然产生：

```text
木制家具燃烧
→ 环境温度升高
→ 电线损坏
→ 供电中断
→ 电梯失效
```

没有一个中央“火灾剧情管理器”专门规定这个链条。

---

## 12. 素材编辑器的目标工作流

长期顶部流程建议为：

```text
① 美术
② 空间
③ 行为
④ 导出
```

### 12.1 美术

负责：

```text
State
Facing
Animation
Frame
Layers
```

当前已实现到 `State -> Facing -> Layers`，Frame 层后续增加。

### 12.2 空间

负责：

```text
Voxel
Collision
Anchor
Walkable / Blocking
State-specific Spatial Data
```

### 12.3 行为

建议组织为：

```text
行为
├── Materials
├── Components / Capabilities
├── Properties
├── References
├── Commands
├── Events
└── Script
```

UI 应让创作者优先勾选和配置标准能力，再编写自定义 Lua。

右侧可提供 API 浏览器和自动补全，例如：

```text
self
scene
world
game
interfaces
```

当 `target : Openable` 时，编辑器应能提示：

```text
open()
close()
lock()
unlock()
```

### 12.4 导出

统一素材包最终应同时包含：

```text
Visual
Spatial
Materials
Components
Interface declarations
Behavior source/bytecode metadata
```

仍保持一个 Prefab/素材协议，不为不同来源建立平行编辑器。

---

## 13. 主游戏 / Scene 编辑器的职责

素材编辑器定义：

> **这个物品是什么、有哪些通用性质、默认如何运行。**

主游戏 / Scene 编辑器定义：

> **这个实例放在哪里、参数覆盖多少、引用具体绑定谁、事件具体连接谁。**

例如按钮 Prefab 声明：

```text
target : Openable
```

进入场景后才配置：

```text
Button_A.target -> Door_17
```

同样可以提供可视化逻辑：

```text
Button_A.pressed
→ Elevator_A.goToFloor(3)
```

Prefab 默认 Behavior 和 Scene Logic 可以共存。

---

## 14. 建议的 Gameplay API 边界

Lua 不直接访问 DOM、Pixi、renderer、raw scene arrays 或内部缓存。

建议通过 facade/API：

```text
self
├── getState()
├── setState()
├── playAnimation()
├── emit()
└── send()

world
├── getById()
├── getByTag()
├── query()
└── spawnPrefab()

scene
├── getFlag()
├── setFlag()
└── emit()

game
├── economy
├── progression
├── inventory
└── quest
```

高频能力由引擎组件提供：

```text
motion.moveTo()
light.setEnabled()
physics.applyForce()
pathfinding.moveActorTo()
```

这既保证性能，也保护现有分层架构。

---

## 15. 开发禁区 / 反模式

### 15.1 禁止大型中央类型分支

避免：

```js
if (type === "bed") ...
else if (type === "door") ...
else if (type === "lamp") ...
```

应该查询 Capability / Interface。

### 15.2 禁止把所有规则复制到 Lua

材料燃烧、通用伤害、电力消费者等应由共享能力实现。

### 15.3 禁止 Prefab 硬编码场景实例 ID

优先 Reference slot、Tag、Group 或 Scene wiring。

### 15.4 禁止脚本直接修改 renderer / cache

所有世界修改必须走 Gameplay API / Command / Domain 层。

### 15.5 禁止默认逐帧脚本

没有显式需求就保持对象休眠。

### 15.6 禁止把动画帧当 State

State 表示语义状态；Frame 表示一个动画内部的时间采样。

### 15.7 禁止把“材料”与“具体素材 Prefab”混为一谈

木床使用 `Wood` 材料，不继承 `WoodBlock` 的图片、voxel 和交互。

---

## 16. 示例：木床

目标定义：

```text
WoodenBed
│
├── Visual
│   ├── normal
│   ├── occupied
│   └── burning
│
├── Spatial
│   └── state-specific voxel/collision if needed
│
├── Materials
│   ├── frame -> Wood
│   └── mattress -> Cloth
│
├── Components
│   ├── Damageable
│   ├── Flammable
│   ├── Movable
│   └── Sleepable
│
├── Properties
│   ├── comfort = 0.8
│   └── sleepRecovery = 10
│
├── Commands
│   └── sleep(actor)
│
├── Events
│   ├── sleepStarted
│   ├── sleepFinished
│   └── destroyed
│
└── Behavior
    └── 仅实现无法由通用组件表达的床特有规则
```

涌现结果可能包括：

```text
火源靠近
→ Cloth / Wood 根据各自燃点吸热
→ 床开始燃烧
→ Heat 向附近传播
→ Damageable 耐久下降
→ destroyed
```

同时：

```text
Actor interact
→ Sleepable
→ actor sleeping
→ 恢复精力
```

两套行为来自不同通用规则，不需要一个中央 `BedManager`。

---

## 17. 与现有项目架构的关系

现有项目已经在做的正确基础：

1. 素材编辑器与主程序通过统一 Prefab 协议连接；
2. artwork、voxel、anchor、facing 被逐步统一；
3. 素材支持多 state；
4. 每个 state 可保存独立 voxel / collision / anchor；
5. Habbo 是导入来源，不是独立平行编辑器；
6. 当前多状态编辑仍是素材层能力，主游戏运行时交互状态切换尚未完整实现。

涌现式素材系统应继续遵守当前四层架构边界：

```text
Presentation
Application
Domain Core
Infrastructure
```

新增 Behavior Runtime 时，不允许 Lua 直接穿透这些层级。

建议新增的长期模块边界：

```text
src/core/domain/gameplay/
    capabilities/
    materials/
    interfaces/
    commands/
    events/

src/application/gameplay/
    behavior-runtime-controller
    event-router
    scene-binding-controller

src/infrastructure/scripting/
    lua-runtime
    sandbox
    compiler-cache

src/presentation/gameplay/
    behavior-editor
    api-browser
    scene-logic-editor
```

具体文件命名可按后续重构规范调整，本节只规定职责边界。

---

## 18. 推荐实施顺序

### Phase 0：冻结语义

先确定：

```text
Material
Component / Capability
Property
Reference
Command
Event
Behavior
```

各自含义与序列化格式。

### Phase 1：声明式 Capability，不引入 Lua

先做几个最小标准能力：

```text
Damageable
Openable
Switchable
Light
```

验证 Prefab 可以组合能力，主程序不依赖具体类型名。

### Phase 2：事件 / Command / Reference

建立：

```text
Event Bus
Message Bus
Reference Slot
Command Dispatch
```

先用数据驱动，不急于加任意脚本。

### Phase 3：Gameplay API

建立受控 facade：

```text
self / refs / actor / scene / world / game
```

### Phase 4：Lua Runtime

要求：

- Prefab 代码共享编译；
- 实例环境轻量；
- 沙盒；
- 事件驱动；
- 执行预算；
- 错误隔离。

### Phase 5：素材编辑器 Behavior 页

**第一版已落地。** 当前包括：

```text
Capabilities 声明
Commands / Events 公开接口
Lua 文本编辑器
Ctrl+Space 轻量补全
assets/prefabs 素材搜索
选择目标 Prefab -> 查看公开接口 -> 点击插入调用
Gameplay API 片段浏览器
Behavior 随 Prefab JSON / .hzhmat 保存
```

后续仍需补齐：

```text
Materials / Components 的真实运行时绑定
Properties / References 的结构化编辑器
真正的 Lua Runtime / 沙盒 / 类型信息
更完整的语法分析、诊断和跳转体验
```

### Phase 6：Scene Logic

主游戏支持：

```text
引用绑定
Event -> Target -> Command
实例属性覆盖
运行 / 暂停 / 重置
```

### Phase 7：基础世界规则扩展

逐步增加：

```text
Temperature / Heat
Power
Signal
Damage types
Mass / Weight
Container / Inventory
```

每增加一个基础规则，都应优先产生更多组合能力，而不是增加更多中心化类型判断。

---

## 19. 验收标准

涌现式素材系统的功能不能只靠“某个 Demo 能运行”验收，应检查以下结构性条件：

- [ ] 新增一种 Prefab 不需要修改中央 `InteractionManager` 的类型分支；
- [ ] 相同 Capability 在多个 Prefab 中共享同一实现；
- [ ] Prefab 可以通过 Reference / Interface 作用于外部对象；
- [ ] Prefab 可以通过 Gameplay API 改变 Actor / Scene / Game 系统；
- [ ] Scene 可以重新绑定引用而无需改 Prefab Lua；
- [ ] 脚本不能直接访问 renderer / DOM / 内部 store；
- [ ] 大量静态对象无事件时不会持续执行脚本；
- [ ] 高频运动由引擎系统执行而不是 Lua 每帧循环；
- [ ] 多个简单能力能够产生未专门硬编码的组合结果；
- [ ] State 与 Animation Frame 在数据结构上严格分离。

---

## 20. 核心架构结论

本项目未来应坚持以下定义：

> **Prefab 是一个自包含的游戏对象定义，包含表现、空间、材料、状态、通用能力、接口和默认行为。**

> **Material 表示“由什么构成”；Component / Capability 表示“具有什么通用能力”；Prefab Behavior 表示“这个具体物品还有什么特殊规则”。**

> **Prefab Behavior 可以改变自己，也可以通过标准接口、Reference、消息和 Gameplay API 影响其他物品、人物、场景和游戏系统。**

> **Prefab 不应硬编码具体 Scene 实例；Scene 负责具体引用绑定与 Event -> Target -> Command 关系。**

> **世界核心只维护少量普适规律；复杂玩法主要由这些规律、通用能力、Prefab 局部行为和对象组合在运行时涌现。**

> **运行时默认事件驱动、默认休眠；Lua 负责决策，TypeScript / JavaScript 引擎负责高频执行。**

这份原则应作为后续素材协议、行为编辑器、脚本运行时、Scene Logic 和世界模拟系统设计时的重要架构约束。


# 独立素材库与 Behavior TestWorld（2026-08-07 增补）

## 1. 素材库必须独立于具体游戏工程

目标结构：

```text
Game / Client
    ↓ 只依赖统一素材协议
Emergent Asset Library
├── door.hzhmat
├── wire.hzhmat
├── bed.hzhmat
└── ...
```

游戏本体不拥有素材库。素材库是独立内容层；客户端只加载玩家/服务器所需的素材包。未来 Java 版 Habbo 批量转换后的素材也应进入同一外部素材库，而不是复制进某一个游戏项目。

当前编辑器已经增加通用 `Emergent Asset Library Root`：通过 `start_editor.bat` 的本地服务器可以配置任意文件夹路径并递归索引 `.hzhmat/.json`；同时保留浏览器文件夹选择作为无路径访问时的回退。

> 当前实现是本地外部素材库。远程素材服务器、版本解析、依赖下载、签名/安全校验尚未实现；未来应建立 `assetId + version + dependencies` 的远程 Registry/Cache 层。

## 2. Behavior TestWorld

行为页下方提供一个隔离 TestWorld。它不是当前素材的单物体 Preview，而是一个小型运行环境：

- 当前正在编辑的 Prefab 永远作为一个可放置素材存在；
- 外部素材库中的任意 Prefab 也可搜索并放入；
- 多个 Prefab 可以同时存在，从而测试 `world:findByPrefab(...):command()` 等跨物品联动；
- 测试人物可以移动到格子，用当前 State 的 voxel/collision 检查是否阻挡；
- 点击“运行”后，点击实例触发其 `onClick`（没有时回退 `onInteract`）；
- State 改变后，测试场景立即切换该实例的 artwork，同时读取对应 State 的 voxel。

这使“门”的最小端到端测试成为：

```text
State 0（关闭，有阻挡 voxel）
       ↓ onClick
State 1（打开，无阻挡 voxel）
       ↓
测试人物能够通过
```

## 3. 当前 Lua Test Runtime 的边界

当前 TestWorld 为了先打通架构，只实现受控 Lua 子集：`onClick/onInteract`、函数 Command、`self:getState()`、`self:setState()`、`self:emit()`、`world:findByPrefab(...):command()`、金币/经验和场景 Flag 等。

它的职责是验证 Behavior 数据、Prefab 接口、独立素材库和测试场景之间的端到端关系；正式版本仍应替换为沙盒化 Lua VM，并让正式游戏与 TestWorld 共用同一 Behavior Runtime。

## 4. 长期分发模型

未来推荐：

```text
服务器/房间清单
    ↓ 声明所需 assetId/version
客户端本地缓存
    ↓ 缺什么下载什么
独立素材服务器 / Registry
    ↓
.hzhmat + Behavior + dependencies
```

因此游戏本体、素材库、具体世界/服务器是三个独立层。涌现来自统一世界协议下不同素材的组合，而不是把所有内容编译进游戏本体。

## Behavior TestWorld 实现原则（2026-08-07）

行为编辑器中的测试场景必须直接复用主游戏运行环境，而不是复制一套简化场景：主程序负责摆放、渲染、人物、路径、voxel 与碰撞；Behavior 测试桥只负责 Prefab 注入、脚本事件触发与 State 切换。这样 TestWorld 通过即代表同一逻辑在主游戏环境中通过。

