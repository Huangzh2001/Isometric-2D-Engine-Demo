# v4.18.5 — Ray Transport routing / quality consistency fix

- A button now truthfully says **高精度四向射线传输**.
- `keyframemorph` continues to call `drawKeyframeRayTransportOnFloor`; Visual Hull guidance warp is marked legacy/rejected and is not exposed.
- Active A geometry no longer changes when dragging: 256-class XY grid and 80 z samples are used in both states.
- Exact keyframe renderer remains unchanged.
