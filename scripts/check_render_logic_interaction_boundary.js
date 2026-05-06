#!/usr/bin/env node
/*
 * P11a-1 render logic interaction boundary check.
 * Ensures controller/view-rotation boundary access has a dedicated owner and
 * render/logic.js consumes it through thin wrappers.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function indexOfOrError(source, needle, label) {
  const idx = source.indexOf(needle);
  if (idx < 0) errors.push(`${label} missing ${needle}`);
  return idx;
}

const boundaryRel = 'src/presentation/render/interaction/render-logic-interaction-boundary.js';
const logicRel = 'src/presentation/render/logic.js';
const indexRel = 'index.html';

if (!fs.existsSync(path.join(root, boundaryRel))) errors.push(`${boundaryRel} is missing`);

const boundarySource = fs.existsSync(path.join(root, boundaryRel)) ? read(boundaryRel) : '';
const logicSource = read(logicRel);
const indexSource = read(indexRel);

for (const symbol of [
  '__RENDER_LOGIC_INTERACTION_BOUNDARY__',
  'IsometricRenderLogicInteractionBoundary',
  'isMainEditorViewAnimating',
  'getSafeMainEditorViewRotationValue',
  'getMainViewProjectionConfig',
  'getMainViewRotationCoreApi',
]) {
  if (!boundarySource.includes(symbol)) errors.push(`${boundaryRel} missing ${symbol}`);
}

const bannedInBoundary = [
  /document\./,
  /localStorage/,
  /sessionStorage/,
  /fetch\s*\(/,
  /new\s+Image\s*\(/,
  /CanvasRenderingContext2D/,
  /\.drawImage\s*\(/,
  /\.fillRect\s*\(/,
  /\.stroke\s*\(/,
];
for (const re of bannedInBoundary) {
  if (re.test(boundarySource)) errors.push(`${boundaryRel} must not contain ${re}`);
}

if (!logicSource.includes('P11a-1 note: controller/view-rotation boundary access is delegated')) {
  errors.push(`${logicRel} missing P11a-1 notice`);
}
if (!logicSource.includes('function requireRenderLogicInteractionBoundaryForLogic()')) {
  errors.push(`${logicRel} missing requireRenderLogicInteractionBoundaryForLogic wrapper`);
}
if (!logicSource.includes('requireRenderLogicInteractionBoundaryForLogic().isMainEditorViewAnimating')) {
  errors.push(`${logicRel} must delegate isMainEditorViewAnimatingForLogic to boundary API`);
}
if (!logicSource.includes('requireRenderLogicInteractionBoundaryForLogic().getSafeMainEditorViewRotationValue')) {
  errors.push(`${logicRel} must delegate getSafeMainEditorViewRotationValue to boundary API`);
}
if (!logicSource.includes('requireRenderLogicInteractionBoundaryForLogic().getMainViewProjectionConfig')) {
  errors.push(`${logicRel} must delegate getMainViewProjectionConfig to boundary API`);
}

const logicOldPatterns = [
  /isMainEditorViewRotating\s*\(\s*['"]presentation\.render\.logic['"]\s*\)/,
  /getMainEditorVisualRotation\s*\(\s*['"]presentation\.render\.logic['"]\s*\)/,
  /getMainEditorViewRotation\s*\(\s*['"]presentation\.render\.logic['"]\s*\)/,
  /runtimeState\s*=\s*window\.App\s*&&\s*window\.App\.state/,
];
for (const re of logicOldPatterns) {
  if (re.test(logicSource)) errors.push(`${logicRel} still directly owns old interaction boundary pattern ${re}`);
}

const boundaryIdx = indexOfOrError(indexSource, 'src/presentation/render/interaction/render-logic-interaction-boundary.js', indexRel);
const logicIdx = indexOfOrError(indexSource, 'src/presentation/render/logic.js', indexRel);
if (boundaryIdx >= 0 && logicIdx >= 0 && boundaryIdx > logicIdx) {
  errors.push(`${boundaryRel} must load before ${logicRel}`);
}

const result = {
  status: errors.length ? 'FAIL' : 'PASS',
  errors,
  warnings,
  checked: [boundaryRel, logicRel, indexRel],
};
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exit(1);
