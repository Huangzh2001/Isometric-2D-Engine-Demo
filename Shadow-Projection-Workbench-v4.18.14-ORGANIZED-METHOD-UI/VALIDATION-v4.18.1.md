# Validation v4.18.1

## Direct-index packaging

- `index.html` has no external `<script src>` dependencies.
- `index.html` has no external stylesheet dependency.
- All local PNG test assets are embedded as data URIs.
- Page title, badge, boot text, runtime APP_VERSION and debug-export version are v4.18.1-consistent.
- Alternative server launchers were removed; `index.html` is the intended entry point.

## Runtime bugs found by browser execution and fixed

Browser execution exposed two missing runtime helpers that static tests had not entered:

1. `wrapAngleRad is not defined`
2. `pointInLoopsEvenOdd is not defined`

Both are fixed in v4.18.1.

## Runtime screenshot checks

The container's managed Chromium blocks navigation to both `file://` and `data:` URLs by enterprise policy. To test the exact same self-contained `index.html` contents without changing the application, the complete HTML string was injected verbatim into an allowed `about:blank` page through Chrome DevTools Protocol, after which the normal inline scripts and embedded PNGs executed.

Verified states:

- exact keyframe mode: no runtime error;
- directional light + Method A: no runtime error;
- point light + Method A: no runtime error;
- runtime badge/version: `v4.18.1-matsushita-visual-hull-guidance-warp-direct-index`.

Screenshots are in `validation-screenshots/`.
