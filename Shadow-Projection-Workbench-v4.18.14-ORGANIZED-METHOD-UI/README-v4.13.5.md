# v4.13.5 Near-ground visual-hull slice footprint

Replaces the old contact-cluster footprint estimator with a multi-view near-ground visual-hull slice.

- Samples a thin z-slab near the ground instead of guessing the lowest pixels in 2D.
- Supports multiple disconnected contact regions (for example two feet or four chair legs).
- Uses the inferred components directly in the support-shadow path.
