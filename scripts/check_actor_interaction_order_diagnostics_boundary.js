#!/usr/bin/env node
/* P12b-5 actor interaction order diagnostics boundary check. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const errors = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function indexOfOrFail(source, needle, rel) {
  const i = source.indexOf(needle);
  if (i < 0) errors.push(`${rel}: missing ${needle}`);
  return i;
}
const ownerRel = 'src/presentation/render/diagnostics/actor-interaction-order-diagnostics.js';
const renderRel = 'src/presentation/render/render.js';
const indexRel = 'index.html';
if (!exists(ownerRel)) errors.push(`missing ${ownerRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);
const owner = exists(ownerRel) ? read(ownerRel) : '';
const render = exists(renderRel) ? read(renderRel) : '';
const index = exists(indexRel) ? read(indexRel) : '';
const ownerIdx = indexOfOrFail(index, ownerRel, indexRel);
const renderIdx = indexOfOrFail(index, renderRel, indexRel);
if (ownerIdx >= 0 && renderIdx >= 0 && ownerIdx > renderIdx) errors.push(`${indexRel}: actor diagnostics owner must load before render.js`);
if (!owner.includes("layer: 'presentation/render/diagnostics'")) errors.push(`${ownerRel}: missing diagnostics layer marker`);
if (!owner.includes("phase: 'P12b-5'")) errors.push(`${ownerRel}: missing P12b-5 phase marker`);
for (const marker of [
  'global.IsometricActorInteractionOrderDiagnostics',
  'global.__ACTOR_INTERACTION_ORDER_DIAGNOSTICS__',
  'global.__APP_PRESENTATION_ACTOR_INTERACTION_ORDER_DIAGNOSTICS__',
  'global.__ACTOR_SORT_DIAG_RUNTIME__'
]) {
  if (!owner.includes(marker)) errors.push(`${ownerRel}: missing export ${marker}`);
}
for (const name of [
  'getActorInteractionSortRadiusForRender',
  'isActorInteractionOrderDiagEnabled',
  'emitActorInteractionOrderDiag',
  'noteActorInteractionRenderEntryForRender',
  'summarizeActorDiagRenderable',
  'summarizeActorDiagNearbyBoxes',
  'shouldEmitActorInteractionDiagSignature',
  'logActorInteractionFinalOrderDiagnostics'
]) {
  if (!owner.includes(`function ${name}`)) errors.push(`${ownerRel}: missing function ${name}`);
  if (!render.includes(`requireActorInteractionOrderDiagnosticsForRender().${name}`)) errors.push(`${renderRel}: ${name} should delegate to actor diagnostics owner`);
}
for (const forbidden of [
  'var __actorInteractionOrderDiagState =',
  'ACTOR_INTERACTION_SORT_RADIUS = 2',
  "runtimeState.emittedCount += 1",
  "'[actor-sort-diag][' + String(tag || 'event')",
  "localStorage.getItem('actorSortDiag')",
  "lastCandidateSignature !== candidateSignature",
  "lastReplacementSignature !== replacementSignature"
]) {
  if (render.includes(forbidden)) errors.push(`${renderRel}: moved actor diagnostics implementation still present: ${forbidden}`);
}
for (const forbidden of ['ctx.', 'drawImage', 'Path2D', 'buildRenderables', 'buildActorInteractionCandidateFaceKeySetForPlayer', 'applyActorInteractionReplacementToRenderables', 'document.querySelector']) {
  if (owner.includes(forbidden)) errors.push(`${ownerRel}: diagnostics owner must not contain ${forbidden}`);
}
const ownerBytes = Buffer.byteLength(owner, 'utf8');
if (ownerBytes > 51200) errors.push(`${ownerRel}: owner is too large (${ownerBytes} bytes), split instead of creating a new large node`);
const report = { status: errors.length ? 'FAIL' : 'PASS', ownerRel, renderRel, ownerBytes, errors };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
