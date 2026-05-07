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
const adapterRel = 'src/presentation/render/renderables/renderable-order-adapter.js';
const renderRel = 'src/presentation/render/render.js';
if (!exists(adapterRel)) errors.push(`missing ${adapterRel}`);
if (!exists(renderRel)) errors.push(`missing ${renderRel}`);
const adapter = exists(adapterRel) ? read(adapterRel) : '';
const render = exists(renderRel) ? read(renderRel) : '';
for (const htmlRel of listRootHtml()) {
  const html = read(htmlRel);
  assertLoadsBefore(html, 'src/core/domain/render-order-core.js', adapterRel, htmlRel);
  assertLoadsBefore(html, 'src/core/domain/view-rotation-core.js', adapterRel, htmlRel);
  assertLoadsBefore(html, adapterRel, renderRel, htmlRel);
}
if (!adapter.includes("layer: 'presentation/render/renderables'")) errors.push(`${adapterRel}: must identify presentation/render/renderables layer`);
if (!adapter.includes('render-facing-sort-meta-adapter')) errors.push(`${adapterRel}: must own render-facing sort meta adapter`);
if (!adapter.includes('orderCore.mergeSortedRenderables')) errors.push(`${adapterRel}: must delegate merge to render-order core API`);
if (!adapter.includes('orderCore.compareRenderableOrder')) errors.push(`${adapterRel}: must delegate compare fallback to render-order core API`);
for (const [pattern, msg] of [
  [/\bctx\s*\./, 'must not draw through ctx'],
  [/\bdocument\s*\./, 'must not access DOM'],
  [/\blocalStorage\s*\./, 'must not read localStorage'],
  [/\bnew\s+Image\b/, 'must not allocate Image']
]) {
  if (pattern.test(adapter)) errors.push(`${adapterRel}: ${msg}`);
}
if (adapter.includes('actor-interaction-replacement-packet')) errors.push(`${adapterRel}: must not own actor replacement packet construction`);
if (!render.includes('requireRenderableOrderAdapterForRender')) errors.push(`${renderRel}: missing adapter require wrapper`);
if (!render.includes('return requireRenderableOrderAdapterForRender().computeViewAwareSortMeta')) errors.push(`${renderRel}: computeViewAwareSortMeta must delegate to adapter`);
if (!render.includes('return requireRenderableOrderAdapterForRender().mergeSortedRenderables')) errors.push(`${renderRel}: mergeSortedRenderables must delegate to adapter`);
if (render.includes('var api = getViewRotationCoreApi();\n  if (api && typeof api.computeRenderableSortMeta')) errors.push(`${renderRel}: sort-meta adapter body must not remain in render.js`);
if (render.includes('var domainCore = getDomainSceneCoreApi();\n  if (domainCore && typeof domainCore.compareRenderableOrder')) errors.push(`${renderRel}: comparator adapter body must not remain in render.js`);
const report = { status: errors.length ? 'FAIL' : 'PASS', errors };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
