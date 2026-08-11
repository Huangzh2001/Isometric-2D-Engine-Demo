# v4.18.10 runtime packaging note

Benchmark source silhouettes are embedded data URLs so Canvas alpha extraction works when `index.html` is opened directly via `file://`. This packaging change does not alter Direct Shadow Hull geometry.

# Current Method A

`keyframemorph` = `matsushita-visual-hull-guidance-affine-warp`.

Invariant:

\[
S(\theta_i)=S_i
\]

by direct execution of the original exact-keyframe renderer.

Intermediate pipeline:

\[
\text{calibrated silhouettes}
\to \text{Visual Hull}
\to (G_A,G_t,G_B)
\to \text{blob affine registration}
\to \text{exact-mask attachment}
\to \text{warped exact shadows}.
\]

The Visual Hull is motion guidance only and is never displayed as Method A's final shadow.
