# Lighting Refactor Task

## Goal
Extract the lighting system into `src/lighting/lighting.js` and centralize lighting state, light management, UI wiring, and render entry wrappers without changing behavior.

## Allowed Changes
- Add `src/lighting/lighting.js`
- Move lighting state/helpers from `state.js`
- Move lighting UI helpers from `ui.js`
- Add render entry wrappers used by `render.js`
- Update script wiring and docs

## Forbidden Changes
- Do not rewrite lighting algorithms
- Do not rewrite render pipeline
- Do not change player/placement/scene-storage responsibilities

## Acceptance
- App opens
- Lighting toggle and light editing still work
- Player/object shadows remain visually consistent
- Save/load still works
