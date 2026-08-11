# v4.2.3 validation

- Calibration panel is fixed to the browser viewport, not the stage.
- CSS hard-bounds the panel with top/right/bottom plus viewport width/height caps.
- JS runs a getBoundingClientRect clamp after panel updates and on window resize.
- Player-only controls are hidden for non-player assets.
- Calibration header remains sticky while the panel body scrolls.
- v4.2.2 player movement behavior is unchanged.
