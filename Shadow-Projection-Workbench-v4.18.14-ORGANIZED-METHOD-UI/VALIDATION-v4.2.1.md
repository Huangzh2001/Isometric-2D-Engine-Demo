# v4.2.1 validation

## Scope

This build intentionally keeps the v4.2 core shadow method and adds only:

1. adjustable four-facing mapping for the toilet/isometric caster;
2. a four-direction animated player caster extracted from the main project's `assets/chibi_walk.png`;
3. player-local light-direction mapping and calibration controls;
4. calibration information in exported JSONL/Markdown logs.

## Player sprite extraction

Original sheet layout from the main project:

- frame size: 72 x 96 px
- 4 animation frames per row
- rows: down/front=0, right=1, left=2, up/back=3
- bottom registration: y=88

The demo contains 16 extracted RGBA PNG frames. All 16 were checked as 72 x 96 with non-empty alpha.

## Player local-direction rule

Shadow source selection is based on the light-source direction relative to the player's current facing, not on the currently displayed card alone.

Default local slots:

- light in front -> front image
- light on right -> right image
- light behind -> back image
- light on left -> left image

Examples checked mathematically:

- player faces front + light source is on screen-left -> local left slot
- player faces left + light source is on screen-left -> local front slot
- player faces front + light source is in front -> local front slot

The four local slots are user-adjustable in the calibration panel.

## Static checks

- `node --check app.js`: pass
- `node --check math.js`: pass
- 16 player frames size/alpha validation: pass

## Browser note

Headless Chromium in this container still times out on startup because of the environment's DBus/Chromium issue, so this document does not claim a browser visual inspection. The build is intended for direct visual calibration in the supplied workbench; exported logs include the mapping state and current chosen shadow source directions.
