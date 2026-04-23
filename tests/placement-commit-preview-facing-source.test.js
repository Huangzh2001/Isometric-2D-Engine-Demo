const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const placement = fs.readFileSync(path.join(__dirname, '..', 'src/application/placement/placement.js'), 'utf8');
assert(placement.includes('sourcePreview.rotation != null ? sourcePreview.rotation : 0'), 'commit should preserve explicit preview rotation including 0');
assert(placement.includes("placementRoute('placement-commit'"), 'placement commit should log committed facing');
assert(placement.includes('committedFacing: committedRotation'), 'placement commit log should include committedFacing');
assert(placement.includes("recordItemRotationDiagnostic('placement-commit'"), 'placement commit should write item rotation diagnostic');
console.log('placement-commit-preview-facing-source.test.js: OK');
