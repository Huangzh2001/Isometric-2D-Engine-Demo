#!/usr/bin/env node
/* P12b-6 stable local demerge boundary check. */
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
const ownerRel = 'src/presentation/render/interaction/stable-local-demerge.js';
const renderRel = 'src/presentation/render/render.js';
const indexRel = 'index.html';
if (!exists(ownerRel)) errors.push(`missing ${ownerRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);
const owner = exists(ownerRel) ? read(ownerRel) : '';
const render = exists(renderRel) ? read(renderRel) : '';
const index = exists(indexRel) ? read(indexRel) : '';
const ownerIdx = indexOfOrFail(index, ownerRel, indexRel);
const renderIdx = indexOfOrFail(index, renderRel, indexRel);
if (ownerIdx >= 0 && renderIdx >= 0 && ownerIdx > renderIdx) errors.push(`${indexRel}: stable local demerge owner must load before render.js`);
if (!owner.includes("layer: 'presentation/render/interaction'")) errors.push(`${ownerRel}: missing interaction layer marker`);
if (!owner.includes("phase: 'P12b-6'")) errors.push(`${ownerRel}: missing P12b-6 phase marker`);
for (const marker of [
  'global.IsometricStableLocalDemerge',
  'global.__STABLE_LOCAL_DEMERGE__',
  'global.__APP_PRESENTATION_STABLE_LOCAL_DEMERGE__',
  'global.App.presentation.render.interaction.stableLocalDemerge',
]) {
  if (!owner.includes(marker)) errors.push(`${ownerRel}: missing export ${marker}`);
}
for (const name of [
  'getActorInteractionPacketMemberCells',
  'doesTopPacketActAsPlayerSupportFloor',
  'buildStableLocalDemergeCacheKey',
  'isActorInteractionDescriptorNearPlayerForLocalDemerge',
  'buildStaticWorldFacePacketFromDescriptorForActorDemerge',
  'mergeActorInteractionResidualDescriptorsForPacket',
  'applyStableActorSortDemergeToStaticRenderables',
]) {
  if (!owner.includes(`function ${name}`)) errors.push(`${ownerRel}: missing function ${name}`);
  if (!render.includes(`requireStableLocalDemergeForRender().${name}`)) errors.push(`${renderRel}: ${name} should delegate to stable local demerge owner`);
}
for (const forbidden of [
  'var __stableLocalDemergeCache =',
  'var cell = descriptor && (descriptor.cell || descriptor.box) ? (descriptor.cell || descriptor.box) : null;',
  'var residualDescriptors = farMembers.length ? mergeActorInteractionResidualDescriptorsForPacket(packet, farMembers) : [];',
  "modeLabel === 'near-single' ? 'stable-local-demerge-near-player' : 'stable-local-demerge-residual-merged'",
]) {
  if (render.includes(forbidden)) errors.push(`${renderRel}: moved stable local demerge implementation still present: ${forbidden}`);
  if (!owner.includes(forbidden)) errors.push(`${ownerRel}: moved stable local demerge implementation missing: ${forbidden}`);
}
for (const forbidden of ['ctx.', 'drawImage', 'Path2D', 'document.querySelector', 'localStorage', 'canvas.getContext']) {
  if (owner.includes(forbidden)) errors.push(`${ownerRel}: stable local demerge owner must not contain ${forbidden}`);
}
const ownerBytes = Buffer.byteLength(owner, 'utf8');
if (ownerBytes > 51200) errors.push(`${ownerRel}: owner is too large (${ownerBytes} bytes), split instead of creating a new large node`);
const report = { status: errors.length ? 'FAIL' : 'PASS', ownerRel, renderRel, ownerBytes, errors };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
