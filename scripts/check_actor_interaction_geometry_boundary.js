#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const errors = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function assertLoadsBefore(html, before, after, htmlRel) {
  const beforeIdx = html.indexOf(before);
  const afterIdx = html.indexOf(after);
  if (afterIdx < 0) return;
  if (beforeIdx < 0) errors.push(`${htmlRel}: missing ${before}`);
  else if (beforeIdx > afterIdx) errors.push(`${htmlRel}: ${before} must load before ${after}`);
}
function listRootHtml() {
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.html$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}
const ownerRel = 'src/presentation/render/interaction/actor-interaction-geometry.js';
const renderRel = 'src/presentation/render/render.js';
if (!exists(ownerRel)) errors.push(`missing ${ownerRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);
const owner = exists(ownerRel) ? read(ownerRel) : '';
const render = exists(renderRel) ? read(renderRel) : '';
for (const htmlRel of listRootHtml()) {
  const html = read(htmlRel);
  assertLoadsBefore(html, ownerRel, 'src/presentation/render/interaction/stable-local-demerge.js', htmlRel);
  assertLoadsBefore(html, ownerRel, renderRel, htmlRel);
}
if (!owner.includes("owner: 'actor-interaction-geometry'")) errors.push(`${ownerRel}: missing owner metadata`);
if (!owner.includes('face keys, group summaries, player sort meta')) errors.push(`${ownerRel}: missing responsibility metadata`);
for (const [pattern, msg] of [
  [/\bctx\s*\./, 'must not draw through ctx'],
  [/\bdocument\s*\./, 'must not access DOM'],
  [/\blocalStorage\s*\./, 'must not read localStorage'],
  [/\bnew\s+Image\b/, 'must not allocate Image']
]) {
  if (pattern.test(owner)) errors.push(`${ownerRel}: ${msg}`);
}
if (owner.includes('actor-interaction-replacement-packet')) errors.push(`${ownerRel}: must not own replacement packet construction`);
if (owner.includes('emitActorInteractionOrderDiag')) errors.push(`${ownerRel}: must not own diagnostics emitters`);
if (owner.includes('applyPlayerSupportTopSortOverrideToRenderables')) errors.push(`${ownerRel}: must not own support-top override`);
if (!render.includes('requireActorInteractionGeometryForRender')) errors.push(`${renderRel}: missing actor interaction geometry require wrapper`);
if (!render.includes('return requireActorInteractionGeometryForRender().buildActorInteractionCellFaceKey')) errors.push(`${renderRel}: buildActorInteractionCellFaceKey must delegate`);
if (!render.includes('return requireActorInteractionGeometryForRender().buildActorInteractionGroupSummaryMapFromPackets')) errors.push(`${renderRel}: buildActorInteractionGroupSummaryMapFromPackets must delegate`);
if (!render.includes('return requireActorInteractionGeometryForRender().computeActorInteractionPlayerSortMeta')) errors.push(`${renderRel}: computeActorInteractionPlayerSortMeta must delegate`);
if (render.includes("var screenFace = getScreenFaceForSemanticFace(sf, normalizeMainEditorViewRotationValue(viewRotation));\n  return [\n    cell.instanceId || 'unknown'")) errors.push(`${renderRel}: cell-face-key body must not remain in render.js`);
if (render.includes('var api = getMainViewRotationCoreApi();\n  var cfg = getMainViewProjectionConfigWithoutCamera();')) errors.push(`${renderRel}: no-camera projection body must not remain in render.js`);
if (render.includes('var lineY = lineYAtX(left, right, playerFoot.x);\n  return playerFoot.y >= lineY')) errors.push(`${renderRel}: single-footprint relation body must not remain in render.js`);
const report = { status: errors.length ? 'FAIL' : 'PASS', errors };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
