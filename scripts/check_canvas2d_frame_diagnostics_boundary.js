#!/usr/bin/env node
/*
 * P11c-1 Canvas2D frame diagnostics boundary check.
 * Ensures renderer-facing logging, profile throttling, and breakdown helpers
 * are owned by canvas2d-frame-diagnostics.js rather than canvas2d-renderer.js.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function listRootHtml() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.html$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}
function requireBefore(source, before, after, htmlRel) {
  const beforeIdx = source.indexOf(before);
  const afterIdx = source.indexOf(after);
  if (afterIdx < 0) return;
  if (beforeIdx < 0) errors.push(`${htmlRel}: missing ${before}`);
  else if (beforeIdx > afterIdx) errors.push(`${htmlRel}: ${before} must load before ${after}`);
}

const diagnosticsRel = 'src/presentation/render/renderer/canvas2d-frame-diagnostics.js';
const rendererRel = 'src/presentation/render/renderer/canvas2d-renderer.js';
for (const rel of [diagnosticsRel, rendererRel]) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

const diagnostics = exists(diagnosticsRel) ? read(diagnosticsRel) : '';
const renderer = exists(rendererRel) ? read(rendererRel) : '';
for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  requireBefore(source, diagnosticsRel, rendererRel, htmlRel);
}

for (const symbol of [
  'global.__CANVAS2D_FRAME_DIAGNOSTICS__',
  'renderer.canvas2dFrameDiagnostics',
  'renderer.diagnostics.canvas2dFrame',
  'emitP5',
  'emitRendererProfile',
  'safeFixed',
  'beginFunctionBreakdownFrame',
  'getFunctionBreakdownFrame',
  'getLastBaseWorldPassesBreakdown',
  'cloneSimpleObject',
  'isDetailedRendererProfilingEnabled',
  'shouldEmitProfile',
  'recordDrawDiagnostic'
]) {
  if (!diagnostics.includes(symbol)) errors.push(`${diagnosticsRel}: missing diagnostics API symbol ${symbol}`);
}

if (!renderer.includes('requireCanvas2dFrameDiagnosticsApi') || !renderer.includes('__CANVAS2D_FRAME_DIAGNOSTICS__')) {
  errors.push(`${rendererRel}: must delegate to Canvas2D frame diagnostics owner`);
}
if (!renderer.includes('renderer.canvas2dFrameDiagnostics')) {
  errors.push(`${rendererRel}: must resolve Canvas2D frame diagnostics through namespace path`);
}

const forbiddenBodies = [
  { pattern: /function\s+emitP5\s*\([^)]*\)\s*{[^}]*JSON\.stringify[^}]*pushLog/s, reason: 'P5 log formatting body' },
  { pattern: /function\s+emitRendererProfile\s*\([^)]*\)\s*{[^}]*JSON\.stringify[^}]*pushLog/s, reason: 'renderer profile log formatting body' },
  { pattern: /function\s+safeFixed\s*\([^)]*\)\s*{[^}]*toFixed/s, reason: 'safe fixed number formatting body' },
  { pattern: /function\s+beginFunctionBreakdownFrame\s*\([^)]*\)\s*{[^}]*__RENDER_FUNCTION_BREAKDOWN__\s*=/s, reason: 'function breakdown frame state owner' },
  { pattern: /function\s+getLastBaseWorldPassesBreakdown\s*\([^)]*\)\s*{[^}]*__LAST_BASEWORLD_PASSES_BREAKDOWN__/s, reason: 'base-world breakdown state reader' },
  { pattern: /function\s+isDetailedRendererProfilingEnabled\s*\([^)]*\)\s*{[^}]*localStorage/s, reason: 'detailed renderer profile storage gate' },
  { pattern: /function\s+shouldEmitProfile\s*\([^)]*\)\s*{[^}]*__profileState[^}]*effectiveGap/s, reason: 'profile throttling state' },
  { pattern: /function\s+recordDrawDiagnostic\s*\([^)]*\)\s*{[^}]*__ITEM_ROTATION_DIAGNOSTIC__/s, reason: 'draw diagnostic bridge' },
];
for (const item of forbiddenBodies) {
  if (item.pattern.test(renderer)) errors.push(`${rendererRel}: ${item.reason} must live in ${diagnosticsRel}`);
}

const ownerForbidden = [
  { pattern: /\bdocument\s*\./, reason: 'DOM document access' },
  { pattern: /\bctx\s*\./, reason: 'canvas context drawing' },
  { pattern: /\bcanvas\s*\./, reason: 'Canvas object access' },
  { pattern: /\bfetch\s*\(/, reason: 'network/service access' },
  { pattern: /\bnew\s+Image\b/, reason: 'image allocation' },
  { pattern: /\bOffscreenCanvas\b/, reason: 'offscreen canvas allocation' },
];
for (const item of ownerForbidden) {
  if (item.pattern.test(diagnostics)) errors.push(`${diagnosticsRel}: forbidden ${item.reason}`);
}

const report = { status: errors.length === 0 ? 'PASS' : 'FAIL', diagnosticsRel, rendererRel, checkedHtmlEntries: listRootHtml(), errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
