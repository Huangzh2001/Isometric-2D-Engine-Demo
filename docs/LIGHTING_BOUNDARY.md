# Lighting Boundary

Lighting owns:
- lighting state
- light presets and active-light selection
- light editing UI helpers
- render entry wrappers for glow/shadow/bulbs/axes

Lighting does not own:
- player movement
- placement lifecycle
- scene storage protocol
- underlying shadow/lighting algorithms embedded in logic.js
