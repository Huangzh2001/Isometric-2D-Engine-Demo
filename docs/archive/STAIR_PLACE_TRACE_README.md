# STAIR-PLACE-TRACE diagnostic build

This build intentionally does not claim to fix the preview/commit mismatch. It adds targeted logs for `stair_mc_2step` placement so the mismatch can be proven before the next code change.

## Reproduce

1. Start the project normally.
2. Select `stair_mc_2step`.
3. Move the mouse to the cell where the preview looks wrong.
4. Left-click once to place it.
5. Export the debug log.

## Log marker

Search the exported log for:

```text
[STAIR-PLACE-TRACE]
```

Expected trace phases:

- `preview-candidate`: mouse/top-hit/floor-selected cell, preview origin, preview boxes.
- `preview-draw`: preview draw path, preview fractional AABB, projected screen bounds.
- `commit-authority`: preview boxes vs domain-authoritative boxes vs committed instance boxes.
- `pixi-adopt-voxel-proxy-box`: Pixi graphic worldBounds, localBounds, graphics.x/y/zIndex.

The key comparison is:

```text
preview-draw.screenBoundsBeforeShift
vs
pixi-adopt-voxel-proxy-box.localBounds + graphics.x/y
```

and:

```text
preview-candidate.boxes
vs
commit-authority.committedBoxes
```

If these differ, the trace identifies whether the bug is in candidate selection, preview drawing, commit authority, or Pixi adoption.
