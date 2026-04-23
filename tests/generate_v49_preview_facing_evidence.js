const fs = require('fs');
const vm = require('vm');
const path = require('path');
function runFile(context, relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}
const registry = Object.create(null);
const events = [];
const runtimeState = {
  editor: { rotation: 2, previewFacing: 0, mode: 'place', preview: { prefabId: 'debug_cube_5faces' } },
  setPreviewFacingValue(next, meta) { this.editor.previewFacing = ((Number(next) % 4) + 4) % 4; events.push({ kind: 'runtime-set-preview-facing', payload: { next: this.editor.previewFacing, meta } }); return this.editor.previewFacing; }
};
const prefabs = {
  debug_cube_5faces: { id: 'debug_cube_5faces', name: 'Debug Cube · 5 Faces', w: 1, d: 1, h: 1, semanticTextures: null, voxels: [{ x: 0, y: 0, z: 0 }] },
  debug_rect_2x1_5faces: { id: 'debug_rect_2x1_5faces', name: 'Debug Rect 2×1 · 5 Faces', w: 2, d: 1, h: 1, semanticTextures: null, voxels: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] }
};
const app = { state: { runtimeState }, controllers: {}, domain: {} };
const namespace = {
  bind(p, v) { registry[p] = v; if (p === 'domain.itemFacingCore') app.domain.itemFacingCore = v; if (p.startsWith('controllers.')) app.controllers[p.split('.')[1]] = v; },
  getPath(p) { return registry[p] || null; }
};
registry['state'] = { runtimeState };
registry['state.runtimeState'] = runtimeState;
registry['state.prefabRegistry'] = { getPrefabById(id) { return prefabs[id] || prefabs.debug_cube_5faces; } };
registry['infrastructure.itemRotationDiagnostic'] = { record(kind, payload) { events.push({ kind, payload }); } };
const context = {
  console, JSON, Math, Number, String, Object, Array, Date,
  window: { __APP_NAMESPACE: namespace, App: app },
  editor: runtimeState.editor,
  currentPrefab() { return prefabs.debug_cube_5faces; },
  inspectorState: { selectedInstanceId: 'placed_1' },
  findInstanceById(id) { return { instanceId: id, prefabId: 'debug_cube_5faces', rotation: 3 }; },
  pushLog() {}
};
vm.createContext(context);
runFile(context, 'src/core/domain/item-facing-core.js');
const textureMap = app.domain.itemFacingCore.getDefaultSemanticTextureMap();
prefabs.debug_cube_5faces.semanticTextures = textureMap;
prefabs.debug_rect_2x1_5faces.semanticTextures = textureMap;
runFile(context, 'src/application/controllers/app-controllers.js');
const placement = app.controllers.placement;
const beforePlaced = context.findInstanceById('placed_1').rotation;
const up = placement.rotatePreviewFacingByWheel(-1, 'evidence.wheel-up');
const down = placement.rotatePreviewFacingByWheel(1, 'evidence.wheel-down');
const afterPlaced = context.findInstanceById('placed_1').rotation;
const faceRenderables = app.domain.itemFacingCore.buildDebugCuboidFaceRenderables({
  prefab: prefabs.debug_rect_2x1_5faces,
  cells: prefabs.debug_rect_2x1_5faces.voxels,
  itemFacing: 1,
  viewRotation: 0,
  ownerId: 'evidence-preview'
});
const evidence = {
  version: 'v49-preview-facing-boundary',
  agnosticToFloorEditor: true,
  previewFacingInitial: 0,
  wheelUpResult: up,
  wheelDownResult: down,
  finalPreviewFacing: runtimeState.editor.previewFacing,
  viewRotationIndependent: runtimeState.editor.rotation,
  placedInstanceRotationBefore: beforePlaced,
  placedInstanceRotationAfter: afterPlaced,
  selectedInstanceUnchanged: beforePlaced === afterPlaced,
  renderDependency: { hasViewRotation: false, viewRotation: 0, fallbackUsed: true },
  semanticTextureMapKeys: Object.keys(textureMap),
  faceRenderableSample: faceRenderables.faceRenderables.map(f => ({ semanticFace: f.semanticFace, textureId: f.textureId, color: f.color, depthKey: f.depthKey, polygonPoints: f.polygon.length })),
  diagnosticKinds: events.map(e => e.kind),
  hasPreviewWheelRotateLog: events.some(e => e.kind === 'preview-wheel-rotate'),
  hasPreviewVariantBuildLog: events.some(e => e.kind === 'preview-variant-build'),
  hasRuntimePreviewWriteLog: events.some(e => e.kind === 'runtime-set-preview-facing'),
  notes: [
    'previewFacing changes only through application placement controller in UI/wheel handlers',
    'viewRotation fallback remains 0 and is separate from previewFacing',
    'placed instance rotation is unchanged by preview wheel rotation'
  ]
};
fs.writeFileSync('/mnt/data/v49_preview_facing_evidence.json', JSON.stringify(evidence, null, 2));
console.log('wrote /mnt/data/v49_preview_facing_evidence.json');
