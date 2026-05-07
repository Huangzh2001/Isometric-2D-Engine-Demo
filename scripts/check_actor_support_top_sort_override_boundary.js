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
const ownerRel = 'src/presentation/render/interaction/actor-support-top-sort-override.js';
const stableRel = 'src/presentation/render/interaction/stable-local-demerge.js';
const renderRel = 'src/presentation/render/render.js';
if (!exists(ownerRel)) errors.push(`missing ${ownerRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);
const owner = exists(ownerRel) ? read(ownerRel) : '';
const render = exists(renderRel) ? read(renderRel) : '';
for (const htmlRel of listRootHtml()) {
  const html = read(htmlRel);
  assertLoadsBefore(html, stableRel, ownerRel, htmlRel);
  assertLoadsBefore(html, ownerRel, renderRel, htmlRel);
}
if (!owner.includes("owner: 'actor-support-top-sort-override'")) errors.push(`${ownerRel}: missing owner metadata`);
if (!owner.includes('player support-top sort override only')) errors.push(`${ownerRel}: missing support-top responsibility metadata`);
for (const [pattern, msg] of [
  [/\bctx\s*\./, 'must not draw through ctx'],
  [/\bdocument\s*\./, 'must not access DOM'],
  [/\blocalStorage\s*\./, 'must not access localStorage'],
  [/\bnew\s+Image\b/, 'must not allocate Image']
]) {
  if (pattern.test(owner)) errors.push(`${ownerRel}: ${msg}`);
}
if (owner.includes('actor-interaction-replacement-packet')) errors.push(`${ownerRel}: must not own replacement packet construction`);
if (owner.includes('applyActorInteractionReplacementToRenderables')) errors.push(`${ownerRel}: must not own replacement pipeline`);
if (!render.includes('requireActorSupportTopSortOverrideForRender')) errors.push(`${renderRel}: missing support-top require wrapper`);
if (!render.includes('return requireActorSupportTopSortOverrideForRender().applyPlayerSupportTopSortOverrideToRenderables')) errors.push(`${renderRel}: support-top override must delegate`);
if (render.includes('actorInteractionSupportTopSortOverride: true,\n      actorInteractionSupportFloor: true')) errors.push(`${renderRel}: support-top clone body must not remain in render.js`);
const report = { status: errors.length ? 'FAIL' : 'PASS', errors };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
