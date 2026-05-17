# PXM-07.18O5J minimal stale Graphics fix

Base: PXM-07.18O5H1 debug overlay toggle.

Scope: one narrow code fix in `shared-render-optimization-pixi-static-world-packet-consumer.js`.

What was confirmed from O5H1 logs:

- The visible stale artifact corresponded to `GREEN player-sensitive Graphics expected n=1` vs `CYAN actual visible Graphics bounds n=1` diverging during drag/zoom.
- The active chunk was not leaking into normal chunk RenderTexture.
- The artifact was not solved by disabling the whole active chunk order-run path; doing so expanded the bug.

Root cause addressed here:

- `orderRunPlanCache` reused the cached plan wrapper together with `plan.graphicsItems` references from the frame where the plan was first built.
- Those `graphicsItems` are the leftover singleton items that are not baked into order-run RenderTextures.
- Reusing old item objects can preserve stale per-frame `renderSignature` / packet references for the single visible Graphics object, so it can remain at the old bounds while the expected bounds move.

Fix:

- Keep cached `cacheGroups` and existing order-run RenderTexture behavior unchanged.
- On `orderRunPlanCache` hit, rebind only `plan.graphicsItems` to the current frame's item objects using `(orderIndex, chunkTextureSignature, packetId)`.
- Reset `fresh.renderSignature=''` for those rebound singleton Graphics items so persistent Graphics recomputes its signature against the current camera/renderTransform.

Not changed:

- No face merge change.
- No full active chunk suppression.
- No Graphics transform rewrite.
- No chunk RenderTexture change.
- No stable-plan key/cache change.
- No framePlan change.

Validation fields added:

- `orderRunGraphicsItemsReboundToCurrentFrame`
- `orderRunGraphicsItemsReboundCount`
- `orderRunGraphicsItemsRebindMissingCount`

Expected:

- The previous `GREEN expected n=1` and `CYAN actual n=1` bounds should stay aligned during drag/zoom.
- `orderRunGraphicsItemsReboundToCurrentFrame=true` on order-run plan cache-hit frames.
- `orderRunGraphicsItemsRebindMissingCount=0` in normal cases.
