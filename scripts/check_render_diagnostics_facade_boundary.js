#!/usr/bin/env node
/* P12b-4 render diagnostics facade boundary check. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const errors = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function hasFunction(source, name) { return new RegExp('function\\s+' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(').test(source); }
function indexOfOrFail(source, needle, rel) {
  const i = source.indexOf(needle);
  if (i < 0) errors.push(`${rel}: missing ${needle}`);
  return i;
}
const facadeRel = 'src/presentation/render/diagnostics/render-diagnostics-facade.js';
const renderRel = 'src/presentation/render/render.js';
const indexRel = 'index.html';
if (!exists(facadeRel)) errors.push(`missing ${facadeRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);
const facade = exists(facadeRel) ? read(facadeRel) : '';
const render = exists(renderRel) ? read(renderRel) : '';
const index = exists(indexRel) ? read(indexRel) : '';
const facadeIdx = indexOfOrFail(index, facadeRel, indexRel);
const renderIdx = indexOfOrFail(index, renderRel, indexRel);
if (facadeIdx >= 0 && renderIdx >= 0 && facadeIdx > renderIdx) errors.push(`${indexRel}: diagnostics facade must load before render.js`);
if (!facade.includes("layer: 'presentation/render/diagnostics'")) errors.push(`${facadeRel}: missing diagnostics layer marker`);
if (!facade.includes("phase: 'P12b-4'")) errors.push(`${facadeRel}: missing P12b-4 phase marker`);
for (const name of [
  'getRenderDiagnosticsApiForRender',
  'requireRenderDiagnosticsForRender',
  'emitRenderBuildDiagnostic',
  'emitRenderFrameSummary',
  'maybeLogRenderFrameSummary',
  'emitTerrainFirstFramesDetail',
  'getTerrainFrameLogContextForRender',
  'recordRenderFunctionTiming',
  'setLastBaseWorldPassesBreakdown',
  'getLastDrawFloorBreakdown'
]) {
  if (!hasFunction(facade, name)) errors.push(`${facadeRel}: missing function ${name}`);
  if (render.includes(`function ${name}(`)) errors.push(`${renderRel}: moved diagnostics function still defined in render.js: ${name}`);
}
for (const marker of [
  'global.IsometricRenderDiagnosticsFacade',
  'global.__RENDER_DIAGNOSTICS_FACADE__',
  'global.__APP_PRESENTATION_RENDER_DIAGNOSTICS_FACADE__'
]) {
  if (!facade.includes(marker)) errors.push(`${facadeRel}: missing export ${marker}`);
}
for (const forbidden of ['ctx.', 'drawImage', 'Path2D', 'document.', 'fetch(', 'buildRenderables', 'drawRenderableOrder']) {
  if (facade.includes(forbidden)) errors.push(`${facadeRel}: diagnostics facade must not contain ${forbidden}`);
}
const report = { status: errors.length ? 'FAIL' : 'PASS', errors };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
