# v4.3.1 validation

## Direction grouping

- `player-local-cardinal4`: N/E/S/W four independent player facings.
- `diagonal4`: NE/SE/SW/NW four independent isometric facings.
- `single4-diagonal`: one known image explicitly reused only for NE/SE/SW/NW.
- `oct8`: N/NE/E/SE/S/SW/W/NW each use an independent image.
- Included local Taxi oct8 sample with 8 distinct PNG files.

## Ground registration

Kenney landscape source lattice is treated as:
- horizontal step = 130 px
- horizontal half-step = 65 px
- vertical half-step = 33 px

For the demo grid at 72x36:
- sx = 72 / 130
- sy = 18 / 33
- 65 * sx = 36 px exactly
- 33 * sy = 18 px exactly

For landscapeTiles_006 (132x99, alpha bottom=98):
- source ground-center anchor = (66, 98-33) = (66,65)
- source south vertex is exactly 33 source px below the center
- after scaling it is exactly 18 screen px below the world cell center

Ground assets are snapped to a half-cell world center when selected and z is forced to 0.

## Static checks

- `node --check app.js`
- `node --check math.js`
- Taxi direction files N/NE/E/SE/S/SW/W/NW all present and readable.
