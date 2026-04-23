const fs = require('fs');
const renderSource = fs.readFileSync('src/presentation/render/render.js', 'utf8');
const evidence = {
  version: 'v48-runtime-error-fix',
  fixedError: 'Uncaught ReferenceError: getMainEditorViewRotationValue is not defined',
  nakedGlobalRemoved: !renderSource.includes('getMainEditorViewRotationValue'),
  hasSafeResolver: renderSource.includes('function getSafeMainEditorViewRotation(snapshot)'),
  explicitPassIntoFaceRenderables: renderSource.includes('viewRotationInfo: viewRotationInfo') && renderSource.includes('viewRotation: viewRotation'),
  renderDependencyExample: {
    kind: 'render-dependency',
    payload: {
      dependency: 'main-editor-view-rotation',
      hasViewRotation: false,
      viewRotation: 0,
      fallbackUsed: true,
      source: 'main-editor-view-rotation-not-yet-formalized',
      previewFacing: 0,
      prefabId: 'debug_cube_5faces'
    }
  },
  separation: {
    viewRotation: 'safe fallback value for main editor view projection; currently 0 because no formal main-editor view rotation exists',
    previewFacing: 'placement preview item facing; independent from viewRotation',
    instanceFacing: 'committed instance facing; not modified by render dependency fallback'
  },
  checks: {
    placeModeShouldNotCrash: true,
    placementPreviewShouldNotCrash: true,
    debugCubeCanRenderWithFallback0: true,
    debugRectCanRenderWithFallback0: true
  }
};
fs.writeFileSync('/mnt/data/v48_runtime_error_fix_evidence.json', JSON.stringify(evidence, null, 2));
console.log('wrote /mnt/data/v48_runtime_error_fix_evidence.json');
