# Validation v4.4.2

- Existing math tests: 6/6 PASS.
- Pyramid 4-view sliced proxy occupancy by height: [1024, 1012, 968, 888, 772, 608, 460, 336, 240, 164, 96, 44, 12, 0]; monotonically decreases with height.
- Diagonal image slicing uses only lower chain L-B-R and its raised copy; the top/back diamond vertex is excluded from the slice mask.
- Browser screenshot validation could not be run in this environment because Chromium headless does not terminate correctly here; no visual-success claim is made.
