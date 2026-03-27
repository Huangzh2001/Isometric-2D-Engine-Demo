# Player Refactor Task

## Goal
Extract the player movement and collision system into `src/player/player.js` while preserving behavior.

## Scope
This refactor centralizes:
- player movement entry
- input-to-motion conversion
- player collision against world bounds and placed boxes
- player spatial helper functions

## Non-goals
- rewriting occlusion or render ordering
- changing lighting behavior
- changing placement responsibilities
- changing saved scene or prefab data

## Acceptance
- app opens normally
- player movement still responds to input
- world boundary collision still works
- collision with placed objects still works
- placement and scene save/load remain unaffected
