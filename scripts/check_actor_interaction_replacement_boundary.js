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
const ownerRel = 'src/presentation/render/interaction/actor-interaction-replacement.js';
const geometryRel = 'src/presentation/render/interaction/actor-interaction-geometry.js';
const stableRel = 'src/presentation/render/interaction/stable-local-demerge.js';
const renderRel = 'src/presentation/render/render.js';
if (!exists(ownerRel)) errors.push(`missing ${ownerRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);
const owner = exists(ownerRel) ? read(ownerRel) : '';
const render = exists(renderRel) ? read(renderRel) : '';
for (const htmlRel of listRootHtml()) {
  const html = read(htmlRel);
  assertLoadsBefore(html, geometryRel, ownerRel, htmlRel);
  assertLoadsBefore(html, ownerRel, stableRel, htmlRel);
  assertLoadsBefore(html, ownerRel, renderRel, htmlRel);
}
if (!owner.includes("owner: 'actor-interaction-replacement'")) errors.push(`${ownerRel}: missing owner metadata`);
if (!owner.includes('replacement candidate, suppression, replacement renderable')) errors.push(`${ownerRel}: missing replacement responsibility metadata`);
for (const [pattern, msg] of [
  [/\bctx\s*\./, 'must not draw through ctx'],
  [/\bdocument\s*\./, 'must not access DOM'],
  [/\blocalStorage\s*\./, 'must not access localStorage'],
  [/\bnew\s+Image\b/, 'must not allocate Image']
]) {
  if (pattern.test(owner)) errors.push(`${ownerRel}: ${msg}`);
}
if (owner.includes('applyPlayerSupportTopSortOverrideToRenderables')) errors.push(`${ownerRel}: must not own support-top override`);
if (owner.includes('applyStableActorSortDemergeToStaticRenderables')) errors.push(`${ownerRel}: must not own stable-local demerge`);
if (!render.includes('requireActorInteractionReplacementForRender')) errors.push(`${renderRel}: missing replacement require wrapper`);
if (!render.includes('return requireActorInteractionReplacementForRender().buildActorInteractionCandidateFaceKeySetForPlayer')) errors.push(`${renderRel}: candidate face set must delegate`);
if (!render.includes('return requireActorInteractionReplacementForRender().applyActorInteractionReplacementToRenderables')) errors.push(`${renderRel}: replacement application must delegate`);
if (render.includes("var faces = ['top', 'east', 'south', 'west', 'north'];\n  for (var bi = 0; bi < sourceBoxes.length; bi++)")) errors.push(`${renderRel}: candidate iteration body must not remain in render.js`);
if (render.includes("id: 'actor-interaction-packet-' + String(sourcePacket.id || 'packet')")) errors.push(`${renderRel}: replacement packet construction body must not remain in render.js`);
if (render.includes('var filtered = [];\n  var replacements = [];\n  var suppressedPacketCount = 0;')) errors.push(`${renderRel}: replacement assembly body must not remain in render.js`);
const report = { status: errors.length ? 'FAIL' : 'PASS', errors };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
