#!/usr/bin/env node
/*
 * P11 final audit guardrail.
 * Ensures the final audit document exists and the first-round facade targets
 * stay below agreed thresholds after P11 cleanup.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];

function bytes(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    errors.push(`Missing required file: ${rel}`);
    return 0;
  }
  return fs.statSync(file).size;
}

function requireContains(rel, needles) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    errors.push(`Missing required file: ${rel}`);
    return;
  }
  const text = fs.readFileSync(file, 'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) errors.push(`${rel} must mention ${JSON.stringify(needle)}`);
  }
}

requireContains('docs/P11_FINAL_LARGE_NODE_AUDIT.zh-CN.md', [
  'P11 Final Large Node Audit',
  '第一轮大节点减压完成',
  'canvas2d-renderer.js',
  'asset-management.js',
  'scene-storage.js',
  '后续开发硬规则',
]);

requireContains('AGENTS.md', [
  'P11 Final Large Node Audit / Guardrail Freeze',
  'docs/P11_FINAL_LARGE_NODE_AUDIT.zh-CN.md',
]);

const thresholds = [
  ['src/presentation/render/renderer/canvas2d-renderer.js', 50 * 1024],
  ['src/infrastructure/assets/asset-management.js', 50 * 1024],
  ['src/infrastructure/storage/scene-storage.js', 50 * 1024],
  ['src/presentation/ui/ui.js', 90 * 1024],
];

for (const [rel, limit] of thresholds) {
  const size = bytes(rel);
  if (size > limit) {
    errors.push(`${rel} is ${size} bytes, expected <= ${limit}`);
  }
}

const requiredOwners = [
  'src/presentation/render/renderer/canvas2d-active-render-frame.js',
  'src/presentation/render/renderer/canvas2d-frame-pipeline.js',
  'src/presentation/render/renderer/canvas2d-renderable-order-draw.js',
  'src/infrastructure/assets/habbo-library-service.js',
  'src/infrastructure/assets/asset-workflow-service.js',
  'src/infrastructure/storage/scene-snapshot-builder.js',
  'src/infrastructure/storage/scene-snapshot-applier.js',
  'src/presentation/ui/ui-camera-render-panel.js',
  'src/presentation/ui/ui-terrain-panel-refresh.js',
];
for (const rel of requiredOwners) {
  if (!fs.existsSync(path.join(root, rel))) errors.push(`Missing owner file: ${rel}`);
}

const srcRoot = path.join(root, 'src');
const allowedSrcDirs = new Set(['core', 'application', 'presentation', 'infrastructure']);
for (const entry of fs.readdirSync(srcRoot, { withFileTypes: true })) {
  if (entry.isDirectory() && !allowedSrcDirs.has(entry.name)) {
    errors.push(`Unexpected top-level src directory: src/${entry.name}`);
  }
}

if (errors.length) {
  console.error(JSON.stringify({ status: 'FAIL', errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'PASS',
  checked: {
    auditDoc: 'docs/P11_FINAL_LARGE_NODE_AUDIT.zh-CN.md',
    facadeThresholds: thresholds.map(([rel, limit]) => ({ path: rel, bytes: bytes(rel), limit })),
    requiredOwners: requiredOwners.length,
  },
}, null, 2));
