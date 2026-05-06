#!/usr/bin/env node
/*
 * Project hygiene check.
 * No external dependencies. Run from project root:
 *   node scripts/check_project_hygiene.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function listDir(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).map((entry) => ({
    name: entry.name,
    rel: path.join(rel, entry.name).replace(/\\/g, '/'),
    isDirectory: entry.isDirectory(),
    isFile: entry.isFile(),
  }));
}

function walk(rel, out = []) {
  const skipDirs = new Set(['.git', 'node_modules']);
  for (const entry of listDir(rel)) {
    out.push(entry);
    if (entry.isDirectory && !skipDirs.has(entry.name)) walk(entry.rel, out);
  }
  return out;
}

const requiredEntries = [
  'AGENTS.md',
  'README.md',
  'index.html',
  'START_V18_ONLY.html',
  'START_FLOOR_EDITOR.html',
  'AUTO_EDITOR_SAVE_X5.html',
  'src',
  'assets',
  'styles',
  'server',
  'config',
  'docs',
  'tests',
  'scripts/check_main_path_refs.js',
  'scripts/check_render_extracted_symbols.js',
  'scripts/check_render_builder_boundary.js',
  'scripts/check_render_cache_boundary.js',
  'scripts/check_frame_assembler_boundary.js',
  'scripts/check_render_order_boundary.js',
  'scripts/check_canvas_draw_backend_boundary.js',
  'scripts/check_canvas_shadow_backend_boundary.js',
  'scripts/check_canvas_static_world_face_draw_pass_boundary.js',
  'scripts/check_canvas_floor_layer_boundary.js',
  'scripts/check_render_diagnostics_boundary.js',
  'scripts/check_state_legacy_boundary.js',
  'scripts/check_controller_shell_boundary.js',
  'scripts/check_render_logic_boundary.js',
  'scripts/check_render_logic_interaction_boundary.js',
  'scripts/check_render_hit_test_boundary.js',
  'scripts/check_render_preview_interaction_boundary.js',
  'scripts/check_editor_ui_boundary.js',
  'scripts/check_final_hygiene_freeze.js',
  'scripts/check_all_guardrails.js',
  'scripts/report_large_nodes.js',
  'tests/final-hygiene-freeze.test.js',
  'tests/render-hit-test-boundary.test.js',
  'tests/render-preview-interaction-boundary.test.js',
  'docs/P10_FINAL_HYGIENE_FREEZE.zh-CN.md',
  'docs/REMAINING_LARGE_NODES.zh-CN.md',
  'src/application/render/static-world-renderable-builder.js',
  'src/application/render/static-world-render-cache-coordinator.js',
  'src/application/render/main-frame-renderable-assembler.js',
  'src/core/domain/render-order-core.js',
  'src/presentation/render/renderer/canvas2d-draw-primitives.js',
  'src/presentation/render/renderer/canvas2d-shadow-overlays.js',
  'src/presentation/render/renderer/canvas2d-static-world-face-draw-pass.js',
  'src/presentation/render/renderer/canvas2d-floor-layer-draw-pass.js',
  'src/presentation/render/diagnostics/render-diagnostics.js',
  'src/presentation/render/interaction/render-logic-interaction-boundary.js',
  'src/presentation/render/interaction/render-hit-test.js',
  'src/presentation/render/interaction/render-preview-interaction-controller.js',
  'src/infrastructure/legacy/state-bridge.js',
  'src/application/controllers/controller-boundary.js',
  'src/presentation/shell/diagnostics/shell-diagnostics.js',
  'src/presentation/ui/ui-boundary.js',
  'src/presentation/editor/diagnostics/editor-v18-diagnostics.js',
];

for (const rel of requiredEntries) {
  if (!exists(rel)) errors.push(`missing required entry: ${rel}`);
}

const allowedRootFiles = new Set([
  '.gitignore',
  'AGENTS.md',
  'README.md',
  'index.html',
  'START_V18_ONLY.html',
  'START_FLOOR_EDITOR.html',
  'AUTO_EDITOR_SAVE_X5.html',
  'app-shell.js',
  'app.js',
  'lighting-editor.js',
  'state.js',
  'start.bat',
  'start_editor.bat',
  'start_floor_editor.bat',
  'start_replay.bat',
  'start_self_check.bat',
]);

const allowedRootDirs = new Set([
  '.git',
  'assets',
  'config',
  'docs',
  'logs',
  'scripts',
  'server',
  'src',
  'styles',
  'tests',
]);

for (const entry of listDir('.')) {
  if (entry.isFile && !allowedRootFiles.has(entry.name)) {
    errors.push(`unexpected root file: ${entry.name}`);
  }
  if (entry.isDirectory && !allowedRootDirs.has(entry.name)) {
    errors.push(`unexpected root directory: ${entry.name}`);
  }
}

const forbiddenRootPatterns = [
  /^v\d+.*evidence\.json$/i,
  /^v\d+.*delivery.*\.md$/i,
  /^README_PLAYER_STEP_.*\.md$/i,
  /^testwrite$/i,
];

for (const entry of listDir('.')) {
  if (entry.isFile && forbiddenRootPatterns.some((pattern) => pattern.test(entry.name))) {
    errors.push(`stage artifact must not stay in project root: ${entry.name}`);
  }
}

const pyCacheDirs = walk('.').filter((entry) => entry.isDirectory && entry.name === '__pycache__');
for (const entry of pyCacheDirs) {
  errors.push(`python cache directory should not be committed or packaged: ${entry.rel}`);
}

const misplacedBackups = walk('.')
  .filter((entry) => entry.isFile && /\.bak$/i.test(entry.name))
  .map((entry) => entry.rel)
  .filter((rel) => !rel.startsWith('docs/archive/'));
for (const rel of misplacedBackups) {
  errors.push(`backup file must be archived under docs/archive/: ${rel}`);
}

const logFiles = walk('logs').filter((entry) => entry.isFile && /\.log$/i.test(entry.name));
if (logFiles.length > 0) {
  warnings.push(`runtime log files found under logs/: ${logFiles.length}. Keep only if intentionally packaging a debug snapshot.`);
}

if (exists('AUTO_EDITOR_SAVE_X5.html') && exists('src/infrastructure/self-check/scenario-runner.js')) {
  const scenarioRunner = read('src/infrastructure/self-check/scenario-runner.js');
  if (!scenarioRunner.includes('AUTO_EDITOR_SAVE_X5.html')) {
    warnings.push('AUTO_EDITOR_SAVE_X5.html exists but scenario-runner no longer references it; consider archiving it after manual verification.');
  }
}

const archivedEvidenceDir = 'docs/evidence';
if (!exists(archivedEvidenceDir)) {
  errors.push(`missing archived evidence directory: ${archivedEvidenceDir}`);
}

const rootGuards = {
  'app.js': 'src/presentation/shell/app.js',
  'app-shell.js': 'src/presentation/shell/app-shell.js',
  'lighting-editor.js': 'src/presentation/lighting/lighting-editor.js',
  'state.js': 'src/infrastructure/legacy/state.js',
};
for (const [rel, canonical] of Object.entries(rootGuards)) {
  if (!exists(rel)) {
    errors.push(`missing deprecated root guard: ${rel}`);
    continue;
  }
  const source = read(rel);
  if (!source.includes('Deprecated root file loaded')) {
    errors.push(`root guard does not fail fast: ${rel}`);
  }
  if (!source.includes(canonical)) {
    errors.push(`root guard missing canonical pointer: ${rel} -> ${canonical}`);
  }
}

const forbiddenLegacyTopSrcDir = 'src/infrastructure/legacy/top-src';
if (exists(forbiddenLegacyTopSrcDir)) {
  errors.push('legacy top-src source dump must not exist after P2b realignment: ' + forbiddenLegacyTopSrcDir);
}

function normalizeScriptSrc(src) {
  return String(src || '').split('?')[0].split('#')[0].replace(/^\.\//, '');
}
const forbiddenScriptSrc = new Map([
  ['app.js', 'src/presentation/shell/app.js'],
  ['app-shell.js', 'src/presentation/shell/app-shell.js'],
  ['state.js', 'src/infrastructure/legacy/state.js'],
  ['lighting-editor.js', 'src/presentation/lighting/lighting-editor.js'],
  ['src/app.js', 'src/presentation/shell/app.js'],
  ['src/render.js', 'src/presentation/render/render.js'],
  ['src/logic.js', 'src/presentation/render/logic.js or src/core/domain/*'],
  ['src/ui.js', 'src/presentation/ui/ui.js'],
  ['src/state.js', 'src/infrastructure/legacy/state.js plus src/core/state/*'],
  ['src/editor-unified-v18.js', 'src/presentation/editor/editor-unified-v18.js'],
  ['src/player/player.js', 'src/application/player/player.js'],
  ['src/placement/placement.js', 'src/application/placement/placement.js'],
  ['src/lighting/lighting.js', 'src/presentation/lighting/lighting.js'],
  ['src/logging/logging.js', 'src/infrastructure/logging/logging.js'],
  ['src/asset-management/asset-management.js', 'src/infrastructure/assets/asset-management.js'],
  ['src/scene-storage/scene-storage.js', 'src/infrastructure/storage/scene-storage.js'],
]);

const allowedSrcTopEntries = new Set(['application', 'core', 'infrastructure', 'presentation']);
for (const entry of listDir('src')) {
  if (!allowedSrcTopEntries.has(entry.name)) {
    errors.push(`src top-level entry must be one of application/core/infrastructure/presentation: src/${entry.name}`);
  }
}

const rootHtmlEntries = listDir('.')
  .filter((entry) => entry.isFile && /\.html$/i.test(entry.name))
  .map((entry) => entry.rel)
  .sort();
for (const htmlRel of rootHtmlEntries) {
  const source = read(htmlRel);
  const re = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = re.exec(source))) {
    const src = normalizeScriptSrc(match[1]);
    if (forbiddenScriptSrc.has(src)) {
      errors.push(`${htmlRel} loads non-canonical script ${src}; use ${forbiddenScriptSrc.get(src)}`);
    }
  }
}


for (const htmlRel of rootHtmlEntries) {
  const source = read(htmlRel);
  const geometryIdx = source.indexOf('src/core/domain/spatial-geometry-core.js');
  const renderIdx = source.indexOf('src/presentation/render/render.js');
  if (renderIdx >= 0 && geometryIdx < 0) {
    errors.push(htmlRel + ': spatial-geometry-core.js must be loaded before presentation/render/render.js');
  } else if (renderIdx >= 0 && geometryIdx > renderIdx) {
    errors.push(htmlRel + ': spatial-geometry-core.js appears after presentation/render/render.js');
  }
}

for (const htmlRel of rootHtmlEntries) {
  const source = read(htmlRel);
  const habboPlacementIdx = source.indexOf('src/core/domain/habbo-placement-core.js');
  const renderIdx = source.indexOf('src/presentation/render/render.js');
  if (renderIdx >= 0 && habboPlacementIdx < 0) {
    errors.push(htmlRel + ': habbo-placement-core.js must be loaded before presentation/render/render.js');
  } else if (renderIdx >= 0 && habboPlacementIdx > renderIdx) {
    errors.push(htmlRel + ': habbo-placement-core.js appears after presentation/render/render.js');
  }
}

for (const htmlRel of rootHtmlEntries) {
  const source = read(htmlRel);
  const isometricFaceIdx = source.indexOf('src/core/domain/isometric-face-core.js');
  const itemFacingIdx = source.indexOf('src/core/domain/item-facing-core.js');
  const renderIdx = source.indexOf('src/presentation/render/render.js');
  if (renderIdx >= 0 && isometricFaceIdx < 0) {
    errors.push(htmlRel + ': isometric-face-core.js must be loaded before presentation/render/render.js');
  } else if (renderIdx >= 0 && isometricFaceIdx > renderIdx) {
    errors.push(htmlRel + ': isometric-face-core.js appears after presentation/render/render.js');
  }
  if (isometricFaceIdx >= 0 && itemFacingIdx >= 0 && itemFacingIdx > isometricFaceIdx) {
    errors.push(htmlRel + ': item-facing-core.js should load before isometric-face-core.js');
  }
}


for (const htmlRel of rootHtmlEntries) {
  const source = read(htmlRel);
  const terrainFaceMergeIdx = source.indexOf('src/core/domain/terrain-face-merge-core.js');
  const terrainRenderIdx = source.indexOf('src/core/domain/terrain-render-core.js');
  const renderIdx = source.indexOf('src/presentation/render/render.js');
  if (renderIdx >= 0 && terrainRenderIdx < 0) {
    errors.push(htmlRel + ': terrain-render-core.js must be loaded before presentation/render/render.js');
  } else if (renderIdx >= 0 && terrainRenderIdx > renderIdx) {
    errors.push(htmlRel + ': terrain-render-core.js appears after presentation/render/render.js');
  }
  if (terrainFaceMergeIdx >= 0 && terrainRenderIdx >= 0 && terrainFaceMergeIdx > terrainRenderIdx) {
    errors.push(htmlRel + ': terrain-face-merge-core.js should load before terrain-render-core.js');
  }
}


for (const htmlRel of rootHtmlEntries) {
  const source = read(htmlRel);
  const builderIdx = source.indexOf('src/application/render/static-world-renderable-builder.js');
  const coordinatorIdx = source.indexOf('src/application/render/static-world-render-cache-coordinator.js');
  const assemblerIdx = source.indexOf('src/application/render/main-frame-renderable-assembler.js');
  const renderIdx = source.indexOf('src/presentation/render/render.js');
  if (renderIdx >= 0 && assemblerIdx < 0) {
    errors.push(htmlRel + ': main-frame-renderable-assembler.js must be loaded before presentation/render/render.js');
  } else if (renderIdx >= 0 && assemblerIdx > renderIdx) {
    errors.push(htmlRel + ': main-frame-renderable-assembler.js appears after presentation/render/render.js');
  }
  if (builderIdx >= 0 && coordinatorIdx >= 0 && builderIdx > coordinatorIdx) {
    errors.push(htmlRel + ': static-world-renderable-builder.js should load before static-world-render-cache-coordinator.js');
  }
  if (coordinatorIdx >= 0 && assemblerIdx >= 0 && coordinatorIdx > assemblerIdx) {
    errors.push(htmlRel + ': static-world-render-cache-coordinator.js should load before main-frame-renderable-assembler.js');
  }
}


for (const htmlRel of rootHtmlEntries) {
  const source = read(htmlRel);
  const renderOrderIdx = source.indexOf('src/core/domain/render-order-core.js');
  const builderIdx = source.indexOf('src/application/render/static-world-renderable-builder.js');
  const assemblerIdx = source.indexOf('src/application/render/main-frame-renderable-assembler.js');
  const renderIdx = source.indexOf('src/presentation/render/render.js');
  if (renderIdx >= 0 && renderOrderIdx < 0) {
    errors.push(htmlRel + ': render-order-core.js must be loaded before presentation/render/render.js');
  } else if (renderIdx >= 0 && renderOrderIdx > renderIdx) {
    errors.push(htmlRel + ': render-order-core.js appears after presentation/render/render.js');
  }
  if (builderIdx >= 0 && renderOrderIdx >= 0 && renderOrderIdx > builderIdx) {
    errors.push(htmlRel + ': render-order-core.js should load before static-world-renderable-builder.js');
  }
  if (assemblerIdx >= 0 && renderOrderIdx >= 0 && renderOrderIdx > assemblerIdx) {
    errors.push(htmlRel + ': render-order-core.js should load before main-frame-renderable-assembler.js');
  }
}



for (const htmlRel of rootHtmlEntries) {
  const source = read(htmlRel);
  const primitiveIdx = source.indexOf('src/presentation/render/renderer/canvas2d-draw-primitives.js');
  const shadowIdx = source.indexOf('src/presentation/render/renderer/canvas2d-shadow-overlays.js');
  const staticFaceDrawIdx = source.indexOf('src/presentation/render/renderer/canvas2d-static-world-face-draw-pass.js');
  const floorLayerDrawIdx = source.indexOf('src/presentation/render/renderer/canvas2d-floor-layer-draw-pass.js');
  const renderIdx = source.indexOf('src/presentation/render/render.js');
  if (renderIdx >= 0 && primitiveIdx < 0) {
    errors.push(htmlRel + ': canvas2d-draw-primitives.js must be loaded before presentation/render/render.js');
  } else if (renderIdx >= 0 && primitiveIdx > renderIdx) {
    errors.push(htmlRel + ': canvas2d-draw-primitives.js appears after presentation/render/render.js');
  }
  if (renderIdx >= 0 && shadowIdx < 0) {
    errors.push(htmlRel + ': canvas2d-shadow-overlays.js must be loaded before presentation/render/render.js');
  } else if (renderIdx >= 0 && shadowIdx > renderIdx) {
    errors.push(htmlRel + ': canvas2d-shadow-overlays.js appears after presentation/render/render.js');
  }
  if (renderIdx >= 0 && staticFaceDrawIdx < 0) {
    errors.push(htmlRel + ': canvas2d-static-world-face-draw-pass.js must be loaded before presentation/render/render.js');
  } else if (renderIdx >= 0 && staticFaceDrawIdx > renderIdx) {
    errors.push(htmlRel + ': canvas2d-static-world-face-draw-pass.js appears after presentation/render/render.js');
  }
  if (renderIdx >= 0 && floorLayerDrawIdx < 0) {
    errors.push(htmlRel + ': canvas2d-floor-layer-draw-pass.js must be loaded before presentation/render/render.js');
  } else if (renderIdx >= 0 && floorLayerDrawIdx > renderIdx) {
    errors.push(htmlRel + ': canvas2d-floor-layer-draw-pass.js appears after presentation/render/render.js');
  }
  if (primitiveIdx >= 0 && shadowIdx >= 0 && primitiveIdx > shadowIdx) {
    warnings.push(htmlRel + ': canvas2d-draw-primitives.js should normally load before canvas2d-shadow-overlays.js');
  }
  if (shadowIdx >= 0 && staticFaceDrawIdx >= 0 && shadowIdx > staticFaceDrawIdx) {
    warnings.push(htmlRel + ': canvas2d-shadow-overlays.js should normally load before canvas2d-static-world-face-draw-pass.js');
  }
  if (staticFaceDrawIdx >= 0 && floorLayerDrawIdx >= 0 && staticFaceDrawIdx > floorLayerDrawIdx) {
    warnings.push(htmlRel + ': canvas2d-static-world-face-draw-pass.js should normally load before canvas2d-floor-layer-draw-pass.js');
  }
}


for (const htmlRel of rootHtmlEntries) {
  const source = read(htmlRel);
  const runtimeStateIdx = source.indexOf('src/core/state/runtime-state.js');
  const prefabRegistryIdx = source.indexOf('src/core/state/prefab-registry.js');
  const sceneSessionIdx = source.indexOf('src/core/state/scene-session-state.js');
  const stateActionsIdx = source.indexOf('src/application/state/state-actions.js');
  const stateBridgeIdx = source.indexOf('src/infrastructure/legacy/state-bridge.js');
  const legacyStateIdx = source.indexOf('src/infrastructure/legacy/state.js');
  if (legacyStateIdx >= 0 && stateBridgeIdx < 0) {
    errors.push(htmlRel + ': state-bridge.js must be loaded before infrastructure/legacy/state.js');
  } else if (legacyStateIdx >= 0 && stateBridgeIdx > legacyStateIdx) {
    errors.push(htmlRel + ': state-bridge.js appears after infrastructure/legacy/state.js');
  }
  if (stateBridgeIdx >= 0 && runtimeStateIdx >= 0 && runtimeStateIdx > stateBridgeIdx) {
    errors.push(htmlRel + ': runtime-state.js should load before state-bridge.js');
  }
  if (stateBridgeIdx >= 0 && prefabRegistryIdx >= 0 && prefabRegistryIdx > stateBridgeIdx) {
    errors.push(htmlRel + ': prefab-registry.js should load before state-bridge.js');
  }
  if (stateBridgeIdx >= 0 && sceneSessionIdx >= 0 && sceneSessionIdx > stateBridgeIdx) {
    errors.push(htmlRel + ': scene-session-state.js should load before state-bridge.js');
  }
  if (stateBridgeIdx >= 0 && stateActionsIdx >= 0 && stateActionsIdx > stateBridgeIdx) {
    errors.push(htmlRel + ': state-actions.js should load before state-bridge.js');
  }
}



for (const htmlRel of rootHtmlEntries) {
  const source = read(htmlRel);
  const controllerBoundaryIdx = source.indexOf('src/application/controllers/controller-boundary.js');
  const appControllersIdx = source.indexOf('src/application/controllers/app-controllers.js');
  const shellDiagnosticsIdx = source.indexOf('src/presentation/shell/diagnostics/shell-diagnostics.js');
  const shellAppIdx = source.indexOf('src/presentation/shell/app.js');
  const appShellIdx = source.indexOf('src/presentation/shell/app-shell.js');
  if (appControllersIdx >= 0 && controllerBoundaryIdx < 0) {
    errors.push(htmlRel + ': controller-boundary.js must be loaded before application/controllers/app-controllers.js');
  } else if (appControllersIdx >= 0 && controllerBoundaryIdx > appControllersIdx) {
    errors.push(htmlRel + ': controller-boundary.js appears after application/controllers/app-controllers.js');
  }
  if (shellAppIdx >= 0 && shellDiagnosticsIdx < 0) {
    errors.push(htmlRel + ': shell-diagnostics.js must be loaded before presentation/shell/app.js');
  } else if (shellAppIdx >= 0 && shellDiagnosticsIdx > shellAppIdx) {
    errors.push(htmlRel + ': shell-diagnostics.js appears after presentation/shell/app.js');
  }
  if (appShellIdx >= 0 && shellDiagnosticsIdx >= 0 && shellDiagnosticsIdx > appShellIdx) {
    errors.push(htmlRel + ': shell-diagnostics.js should load before presentation/shell/app-shell.js');
  }
}



for (const htmlRel of rootHtmlEntries) {
  const source = read(htmlRel);
  const uiBoundaryIdx = source.indexOf('src/presentation/ui/ui-boundary.js');
  const uiJsIdx = source.indexOf('src/presentation/ui/ui.js');
  const editorDiagnosticsIdx = source.indexOf('src/presentation/editor/diagnostics/editor-v18-diagnostics.js');
  const editorUnifiedIdx = source.indexOf('src/presentation/editor/editor-unified-v18.js');
  if (uiJsIdx >= 0 && uiBoundaryIdx < 0) {
    errors.push(htmlRel + ': ui-boundary.js must be loaded before presentation/ui/ui.js');
  } else if (uiJsIdx >= 0 && uiBoundaryIdx > uiJsIdx) {
    errors.push(htmlRel + ': ui-boundary.js appears after presentation/ui/ui.js');
  }
  if (editorUnifiedIdx >= 0 && editorDiagnosticsIdx < 0) {
    errors.push(htmlRel + ': editor-v18-diagnostics.js must be loaded before editor-unified-v18.js');
  } else if (editorUnifiedIdx >= 0 && editorDiagnosticsIdx > editorUnifiedIdx) {
    errors.push(htmlRel + ': editor-v18-diagnostics.js appears after editor-unified-v18.js');
  }
}

const report = {
  status: errors.length === 0 ? 'PASS' : 'FAIL',
  checkedHtmlEntries: rootHtmlEntries,
  errors,
  warnings,
};

process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length > 0 ? 1 : 0);
