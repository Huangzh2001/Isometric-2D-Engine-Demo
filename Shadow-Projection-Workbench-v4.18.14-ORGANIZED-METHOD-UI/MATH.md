# Projection math

Caster card：底部中心为 `C=(x,y,z)`；`U` 为当前等距视图的屏幕水平世界向量；`V=(0,0,1)`；`n_c = normalize(U×V)`。

## Directional light

光传播方向 `d` 对所有点相同。Receiver 点 `Q` 反向到 caster 平面：

`t = n_c·(Q-C) / (n_c·d)`

`P = Q - t d`

要求 `t>=0`。

## Point light

点光源世界位置 `L`。Receiver 点 `Q` 朝光源回溯：

`P = Q + s(L-Q)`

`s = n_c·(C-Q) / n_c·(L-Q)`

要求 `0<s<1`，即 caster 位于 light 与 receiver 之间。

## Card UV

`u = dot(P-C,U)/W + 0.5`

`v = dot(P-C,V)/H`

仅当 `0<=u<=1` 且 `0<=v<=1` 时采样 sprite alpha。

这意味着 caster 的实际世界 `z` 会直接进入 `C`，物体放在高台、桌面或堆叠物上时不需要另写“离地阴影”规则。
