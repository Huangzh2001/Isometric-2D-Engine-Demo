#!/usr/bin/env node
/*
 * P9e editor/UI boundary check.
 * Verifies UI controller/service accessors and editor health diagnostics are not owned by the large UI/editor files.
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
function idx(source, needle) {
  return source.indexOf(needle);
}

const required = [
  'src/presentation/ui/ui-boundary.js',
  'src/presentation/ui/ui.js',
  'src/presentation/editor/diagnostics/editor-v18-diagnostics.js',
  'src/presentation/editor/editor-unified-v18.js',
  'index.html',
  'START_V18_ONLY.html',
];
for (const rel of required) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

if (errors.length === 0) {
  const indexHtml = read('index.html');
  const uiBoundaryIdx = idx(indexHtml, 'src/presentation/ui/ui-boundary.js');
  const uiJsIdx = idx(indexHtml, 'src/presentation/ui/ui.js');
  if (uiJsIdx >= 0 && uiBoundaryIdx < 0) errors.push('index.html must load ui-boundary.js before ui.js');
  else if (uiJsIdx >= 0 && uiBoundaryIdx > uiJsIdx) errors.push('index.html loads ui-boundary.js after ui.js');

  const startEditor = read('START_V18_ONLY.html');
  const editorDiagIdx = idx(startEditor, 'src/presentation/editor/diagnostics/editor-v18-diagnostics.js');
  const editorIdx = idx(startEditor, 'src/presentation/editor/editor-unified-v18.js');
  if (editorIdx >= 0 && editorDiagIdx < 0) errors.push('START_V18_ONLY.html must load editor-v18-diagnostics.js before editor-unified-v18.js');
  else if (editorIdx >= 0 && editorDiagIdx > editorIdx) errors.push('START_V18_ONLY.html loads editor-v18-diagnostics.js after editor-unified-v18.js');

  const uiBoundary = read('src/presentation/ui/ui-boundary.js');
  if (!uiBoundary.includes('window.__UI_BOUNDARY__')) errors.push('ui-boundary.js must expose window.__UI_BOUNDARY__');
  for (const name of [
    'emitP1bUi',
    'readEditorHandoff',
    'clearEditorHandoff',
    'getUiMainController',
    'getUiSceneController',
    'getUiPlacementController',
    'getUiAssetLibraryController',
    'uiDispatchControllerCommand',
    'uiDirectPatchRenderSettings',
  ]) {
    if (!uiBoundary.includes(name + ':') && !uiBoundary.includes('function ' + name + '(') && !uiBoundary.includes('async function ' + name + '(')) {
      errors.push(`ui-boundary.js missing boundary API: ${name}`);
    }
  }
  for (const forbidden of ['document.getElementById', '.addEventListener(', 'querySelector(', 'innerHTML']) {
    if (uiBoundary.includes(forbidden)) errors.push(`ui-boundary.js must not own DOM binding/rendering logic: ${forbidden}`);
  }

  const uiJs = read('src/presentation/ui/ui.js');
  for (const name of [
    'emitP1bUi',
    'readEditorHandoff',
    'clearEditorHandoff',
    'getUiMainController',
    'getUiSceneController',
    'getUiPlacementController',
    'getUiAssetLibraryController',
    'uiDispatchControllerCommand',
    'uiDirectPatchRenderSettings',
  ]) {
    const re = new RegExp('^\\s*(?:async\\s+)?function\\s+' + name + '\\s*\\(', 'm');
    if (re.test(uiJs)) errors.push(`ui.js must not re-own P9e boundary function: ${name}`);
  }
  if (!uiJs.includes('P9e: UI boundary/service/controller accessors moved')) {
    warnings.push('ui.js missing P9e boundary notice');
  }

  const editorDiag = read('src/presentation/editor/diagnostics/editor-v18-diagnostics.js');
  if (!editorDiag.includes('window.__EDITOR_V18_DIAGNOSTICS__')) errors.push('editor-v18-diagnostics.js must expose window.__EDITOR_V18_DIAGNOSTICS__');
  if (!editorDiag.includes('createHealthReporter')) errors.push('editor-v18-diagnostics.js must export createHealthReporter');
  for (const forbidden of ['document.getElementById', '.addEventListener(', 'querySelector(', 'canvas.getContext']) {
    if (editorDiag.includes(forbidden)) errors.push(`editor-v18-diagnostics.js must not own editor DOM/canvas logic: ${forbidden}`);
  }

  const editor = read('src/presentation/editor/editor-unified-v18.js');
  if (!editor.includes('__EDITOR_V18_DIAGNOSTICS__')) errors.push('editor-unified-v18.js must delegate health reporting to editor-v18-diagnostics.js');
  if (editor.includes('const __editorHealthCheck')) errors.push('editor-unified-v18.js must not directly own __editorHealthCheck after P9e');
}

const report = { status: errors.length === 0 ? 'PASS' : 'FAIL', errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
