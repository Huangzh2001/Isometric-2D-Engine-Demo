#!/usr/bin/env node
/*
 * P11a-7 render build diagnostics gate boundary check.
 * Verifies that detailed static/chunk/color build diagnostic emitter gating is
 * owned by presentation/render/diagnostics/render-build-diagnostics-gate.js and
 * that render.js delegates through thin wrappers.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function idx(source, needle) { return source.indexOf(needle); }
function bodyOf(source, functionName) {
  const start = source.indexOf(`function ${functionName}(`);
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return '';
}
function listRootHtml() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.html$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

const ownerRel = 'src/presentation/render/diagnostics/render-build-diagnostics-gate.js';
const diagnosticsRel = 'src/presentation/render/diagnostics/render-diagnostics.js';
const renderRel = 'src/presentation/render/render.js';
const facadeRel = 'src/presentation/render/diagnostics/render-diagnostics-facade.js';

if (!exists(ownerRel)) errors.push(`missing ${ownerRel}`);
if (!exists(diagnosticsRel)) errors.push(`missing ${diagnosticsRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);
if (!exists(facadeRel)) errors.push(`missing ${facadeRel}`);

const ownerSource = exists(ownerRel) ? read(ownerRel) : '';
const renderSource = exists(renderRel) ? read(renderRel) : '';
const facadeSource = exists(facadeRel) ? read(facadeRel) : '';

for (const htmlRel of listRootHtml()) {
  const source = read(htmlRel);
  const ownerIdx = idx(source, ownerRel);
  const diagnosticsIdx = idx(source, diagnosticsRel);
  const renderIdx = idx(source, renderRel);
  const facadeIdx = idx(source, facadeRel);
  if (renderIdx >= 0 && ownerIdx < 0) errors.push(`${htmlRel}: missing ${ownerRel} before render.js`);
  if (renderIdx >= 0 && ownerIdx > renderIdx) errors.push(`${htmlRel}: ${ownerRel} must load before ${renderRel}`);
  if (renderIdx >= 0 && facadeIdx < 0) errors.push(`${htmlRel}: missing ${facadeRel} before render.js`);
  if (renderIdx >= 0 && facadeIdx > renderIdx) errors.push(`${htmlRel}: ${facadeRel} must load before ${renderRel}`);
  if (ownerIdx >= 0 && diagnosticsIdx >= 0 && diagnosticsIdx > ownerIdx) errors.push(`${htmlRel}: ${diagnosticsRel} must load before ${ownerRel}`);
  if (facadeIdx >= 0 && ownerIdx >= 0 && ownerIdx > facadeIdx) errors.push(`${htmlRel}: ${ownerRel} must load before ${facadeRel}`);
}

if (!ownerSource.includes("layer: 'presentation/render/diagnostics'")) errors.push(`${ownerRel}: must identify presentation/render/diagnostics layer`);
if (!ownerSource.includes("phase: 'P11a-7'")) errors.push(`${ownerRel}: must identify P11a-7 phase`);

for (const forbidden of [
  'localStorage',
  'sessionStorage',
  'fetch(',
  'document.',
  'canvas',
  'ctx.',
  'new Image',
  'buildMainFrameRenderables',
  'staticBoxRenderCache'
]) {
  if (ownerSource.includes(forbidden)) errors.push(`${ownerRel}: must not contain ${forbidden}`);
}

for (const required of [
  'requireRenderDiagnosticsForRender',
  'isDetailedTerrainProfilingEnabledForRender',
  'emitDiagnostic',
  'detailedOnly'
]) {
  if (!ownerSource.includes(required)) errors.push(`${ownerRel}: missing ${required}`);
}

for (const marker of [
  'function requireRenderBuildDiagnosticsGateForRender()',
  'function createRenderBuildDiagnosticsGateDepsForRender()',
  'emitRenderBuildDiagnostic'
]) {
  if (!facadeSource.includes(marker)) errors.push(`${facadeRel}: missing build diagnostics gate marker ${marker}`);
}

for (const fn of [
  'emitChunkRebuildBreakdown',
  'emitChunkRebuildDetail',
  'emitChunkRebuildScopeVerify',
  'emitChunkRebuildHotspot',
  'emitStaticRenderableBuildDetail',
  'emitStaticRenderableBuildHotspot',
  'emitStaticRenderableBuildScopeVerify',
  'emitColorBuildDetail',
  'emitColorBuildHotspot',
  'emitBuildColorPathVerify',
  'emitColorBuildMissBreakdown',
  'emitStep4ColorBuildDetail',
  'emitStep4ColorBuildHotspot',
  'emitStep4ColorBuildScopeVerify',
  'emitLightingShadowBypassVerify',
  'emitStep4ShadowPathSummary'
]) {
  const body = bodyOf(facadeSource, fn);
  if (!body) {
    errors.push(`${facadeRel}: missing ${fn}`);
    continue;
  }
  if (renderSource.includes(`function ${fn}(`)) {
    errors.push(`${renderRel}: ${fn} moved to diagnostics facade but is still defined in render.js`);
  }
  if (!body.includes('emitRenderBuildDiagnostic(') && !body.includes('requireRenderBuildDiagnosticsGateForRender()')) {
    errors.push(`${facadeRel}: ${fn} must delegate to ${ownerRel}`);
  }
  if (body.includes('isDetailedTerrainProfilingEnabledForRender()')) {
    errors.push(`${facadeRel}: ${fn} must not own detailed profiling gate`);
  }
  if (body.includes('requireRenderDiagnosticsForRender().')) {
    errors.push(`${facadeRel}: ${fn} must not call render diagnostics directly`);
  }
}

const report = { status: errors.length ? 'FAIL' : 'PASS', errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
