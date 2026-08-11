# Validation v4.18.0

## Static / mathematical

- `node --check app.js`: PASS
- `test_guidance_affine_registration.js`: PASS
  - known synthetic affine shadow registration symmetric mismatch: 0.0091
  - recovered transformed center error: about 0.0020 world units
- `test_matsushita_endpoint_path.js`: PASS
  - endpoint A directly calls original exact renderer
  - endpoint B directly calls original exact renderer
  - active Method A wrapper calls Matsushita guidance warp
  - guidance metadata explicitly marks the Visual Hull as motion-only
- `test_math.js`: PASS (6/6)
- `test_contour_accel.js`: PASS
- `test_keyframe_pairing.js`: PASS
- `test_directional_keyframe_path.js`: PASS

## Runtime limitation of this validation environment

No claim of browser visual-quality validation is made here. Previous Chromium attempts in this environment were blocked by an administrator policy for local pages. The build therefore still requires visual inspection in the user's browser, especially for topology-changing multi-blob shadows and freely moved finite point lights.

A headless Chromium `file://` launch was attempted in the container. It produced no usable DOM/screenshot before termination, so it is not counted as a visual/runtime pass.
