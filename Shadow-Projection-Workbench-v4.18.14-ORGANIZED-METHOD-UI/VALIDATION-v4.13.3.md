# VALIDATION v4.13.3

## Root cause from user debug log

v4.13.2 called `boundsOfPoly(hull)` inside `estimateEnvelopeHullFootprint`, but the helper itself had been accidentally deleted together with the removed fixed-line helpers. This caused a ReferenceError whenever the new footprint estimator actually reached hull bounds calculation.

## Fix

- restored `boundsOfPoly(poly)` as an independent footprint utility
- kept removed fixed-line helpers removed
- no changes to the v4.13.2 contact-cluster footprint estimator logic

## Checks

- [x] `node --check app.js`
- [x] `test_math.js`: 6/6 pass
- [x] no stale references to removed fixed-line helpers
- [x] active entry files contain only v4.13.3 version markers
- [x] bootstrap smoke test reaches status update with no JavaScript page error under an in-memory Chromium harness (asset visual validation not claimed)
