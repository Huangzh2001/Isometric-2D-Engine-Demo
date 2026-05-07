#!/usr/bin/env node
/*
 * P8e render diagnostics boundary check.
 * Verifies that throttled render diagnostic/profiling emitters are owned by
 * presentation/render/diagnostics/render-diagnostics.js and that render.js
 * delegates to that module instead of re-owning diagnostic state and JSON log
 * construction bodies.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function idx(source, needle) { return source.indexOf(needle); }
function hasFunction(source, name) {
  return new RegExp('function\\s+' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(').test(source);
}
function listRootHtml() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.html$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

const diagnosticsRel = 'src/presentation/render/diagnostics/render-diagnostics.js';
const renderRel = 'src/presentation/render/render.js';
const facadeRel = 'src/presentation/render/diagnostics/render-diagnostics-facade.js';
if (!exists(diagnosticsRel)) errors.push(`missing ${diagnosticsRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);
if (!exists(facadeRel)) errors.push(`missing ${facadeRel}`);
const diagnosticsSource = exists(diagnosticsRel) ? read(diagnosticsRel) : '';
const renderSource = exists(renderRel) ? read(renderRel) : '';
const facadeSource = exists(facadeRel) ? read(facadeRel) : '';
const frameAssemblerRel = 'src/application/render/main-frame-renderable-assembler.js';
const frameAssemblerSource = exists(frameAssemblerRel) ? read(frameAssemblerRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  const diagnosticsIdx = idx(source, diagnosticsRel);
  const renderIdx = idx(source, renderRel);
  const facadeIdx = idx(source, facadeRel);
  if (renderIdx >= 0 && diagnosticsIdx < 0) errors.push(`${htmlRel}: missing ${diagnosticsRel} before render.js`);
  else if (renderIdx >= 0 && diagnosticsIdx > renderIdx) errors.push(`${htmlRel}: ${diagnosticsRel} must load before ${renderRel}`);
  if (renderIdx >= 0 && facadeIdx < 0) errors.push(`${htmlRel}: missing ${facadeRel} before render.js`);
  else if (renderIdx >= 0 && facadeIdx > renderIdx) errors.push(`${htmlRel}: ${facadeRel} must load before ${renderRel}`);
}

if (!diagnosticsSource.includes("layer: 'presentation/render/diagnostics'")) errors.push(`${diagnosticsRel}: must identify presentation/render/diagnostics layer`);
if (!diagnosticsSource.includes("phase: 'P8e'")) errors.push(`${diagnosticsRel}: must identify P8e phase`);
for (const forbidden of ['ctx.', 'drawImage', 'Path2D', 'document.', 'localStorage', 'fetch(', 'staticBoxRenderCache', 'buildRenderables', 'buildMainFrameRenderables']) {
  if (diagnosticsSource.includes(forbidden)) errors.push(`${diagnosticsRel}: diagnostics module must not contain ${forbidden}`);
}

for (const name of [
  'maybeLogStaticWorldChunkSummary',
  'emitChunkRebuildBreakdown',
  'emitStaticRenderableBuildDetail',
  'maybeLogRenderFrameSummary',
  'shouldForceExactVisibleSummary',
  'maybeLogCameraStaticWorldVerify',
  'maybeLogCameraMoveVerify',
  'maybeLogFrameWorkBreakdown',
  'maybeLogZoomStateVerify',
  'maybeLogStaticCacheInvalidationVerify',
  'maybeLogStaticBoxCacheProfile',
  'beginRenderFrameDiagnosticState',
  'captureStaticBoxCacheFrameState',
  'getCurrentRenderFrameStaticCacheState',
  'emitTerrainFirstFramesDetail'
]) {
  if (!hasFunction(diagnosticsSource, name)) errors.push(`${diagnosticsRel}: missing function ${name}`);
}

const requiredRenderDiagnosticsDelegationMarkers = [
  'requireRenderDiagnosticsForRender().maybeLogStaticWorldChunkSummary',
  'requireRenderDiagnosticsForRender().maybeLogRenderFrameSummary',
  'requireRenderDiagnosticsForRender().shouldForceExactVisibleSummary',
  'requireRenderDiagnosticsForRender().maybeLogStaticBoxCacheProfile',
  'requireRenderDiagnosticsForRender().captureStaticBoxCacheFrameState',
  'requireRenderDiagnosticsForRender().getCurrentRenderFrameStaticCacheState'
];
for (const marker of requiredRenderDiagnosticsDelegationMarkers) {
  if (!facadeSource.includes(marker)) errors.push(`${facadeRel}: missing render diagnostics delegation marker ${marker}`);
}
if (!facadeSource.includes("emitRenderBuildDiagnostic('emitChunkRebuildBreakdown'")) {
  errors.push(`${facadeRel}: missing render build diagnostics gate delegation marker emitChunkRebuildBreakdown`);
}
for (const moved of [
  'function getRenderDiagnosticsApiForRender',
  'function emitRenderFrameSummary',
  'function maybeLogRenderFrameSummary',
  'function emitChunkRebuildBreakdown',
  'function recordRenderFunctionTiming'
]) {
  if (renderSource.includes(moved)) errors.push(`${renderRel}: moved diagnostics facade function still lives in render.js: ${moved}`);
}

for (const forbidden of [
  '__lastRenderFrameSummaryLogAt',
  '__lastStaticBoxCacheProfileLogAt',
  '__currentRenderFrameStaticCacheState',
  '__lastStaticWorldChunkLogAt',
  "var line = '[CHUNK-REBUILD-BREAKDOWN] '",
  "var line = '[STATIC-BOX-CACHE-PROFILE] '",
  "var line = '[RENDER-FRAME-SUMMARY] '"
]) {
  if (renderSource.includes(forbidden)) errors.push(`${renderRel}: diagnostic state/body still lives in render.js: ${forbidden}`);
}

for (const forbidden of ['__lastRenderFrameSummaryLogAt']) {
  if (frameAssemblerSource.includes(forbidden)) errors.push(`${frameAssemblerRel}: must not read migrated diagnostics state directly: ${forbidden}`);
}
if (frameAssemblerSource && !frameAssemblerSource.includes('shouldForceExactVisibleSummaryForRender')) {
  errors.push(`${frameAssemblerRel}: should use shouldForceExactVisibleSummaryForRender instead of diagnostics state variables`);
}

const report = { status: errors.length ? 'FAIL' : 'PASS', errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
