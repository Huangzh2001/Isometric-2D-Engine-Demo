# Benchmark anti-aliasing / rasterization note

Direct Shadow Hull itself is continuous/analytic in source-contour space. Display rasterization and benchmark rasterization are separate layers.

The v4.18.7 report rasterized prediction and GT on 192/256-square **pixel-center binary grids**. This can bias edge-sensitive metrics, especially on thin structures. Therefore:

1. its phantom-volume trend and `GT ⊆ prediction` signature remain useful geometric diagnostics;
2. its exact IoU/Chamfer/Hausdorff values are not advertised as final subpixel scores;
3. v4.18.8 display uses adaptive 4x4 coverage AA on boundary pixels, with no blur/dilation/closing;
4. future final benchmarks must use equal high-resolution coverage/supersampling for both prediction and ground truth (or continuous polygonal geometry) before measuring edge-sensitive metrics.
