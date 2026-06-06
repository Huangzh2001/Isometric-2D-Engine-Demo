const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(html.includes('id="fluidRenderTopSubdivisionLinesEnabled"'), 'Fluid / Render should contain top subdivision lines checkbox');
assert(html.includes('显示顶面分割线'), 'checkbox label should explain the visible top subdivision lines');

const config = fs.readFileSync(path.join(root, 'src/core/domain/fluid-render-config-core.js'), 'utf8');
assert(config.includes('topSubdivisionLinesEnabled: true'), 'config should default top subdivision lines to visible');
assert(config.includes('getTopSubdivisionLinesEnabled'), 'config should expose top subdivision line getter');

const liquid = fs.readFileSync(path.join(root, 'src/core/domain/liquid-render-core.js'), 'utf8');
assert(liquid.includes('topSubdivisionLinesEnabled'), 'liquid renderer should receive top subdivision line option');
assert(liquid.includes('stroke: normalizeTopSubdivisionLinesEnabled(topSubdivisionLinesEnabled) ?'), 'liquid renderer should toggle top-subface stroke');
assert(liquid.includes('LIQUID-RENDER-V18-TOP-LINES-OFF-PRESERVED'), 'liquid phase should identify top line toggle');

const builder = fs.readFileSync(path.join(root, 'src/application/render/static-world-renderable-builder.js'), 'utf8');
assert(builder.includes('getFluidTopSubdivisionLinesEnabled'), 'static builder should read top subdivision line config');
assert(builder.includes('topSubdivisionLinesEnabled: getFluidTopSubdivisionLinesEnabled()'), 'static builder should pass top subdivision line option');
assert(builder.includes("stroke: face.stroke !== undefined ? face.stroke"), 'static builder should preserve explicitly hidden liquid top strokes');
assert(builder.includes("width: face.width !== undefined ? face.width"), 'static builder should preserve explicit zero liquid top stroke width');
assert(builder.includes('liquid-render-v18-top-lines-off-preserved'), 'builder should identify preserved hidden top line render path');

console.log('fluid-top-subdivision-lines-toggle.test.js PASS');
