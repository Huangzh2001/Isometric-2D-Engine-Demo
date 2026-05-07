#!/usr/bin/env node
/* P12c static world face descriptor builder boundary check. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const errors = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
const ownerRel = 'src/application/render/static-world-face-descriptor-builder.js';
const builderRel = 'src/application/render/static-world-renderable-builder.js';
const indexRel = 'index.html';
if (!exists(ownerRel)) errors.push(`missing ${ownerRel}`);
if (!exists(builderRel)) errors.push(`missing ${builderRel}`);
const owner = exists(ownerRel) ? read(ownerRel) : '';
const builder = exists(builderRel) ? read(builderRel) : '';
const index = exists(indexRel) ? read(indexRel) : '';
if (!owner.includes('buildStaticWorldFaceDescriptors')) errors.push(`${ownerRel}: must expose buildStaticWorldFaceDescriptors`);
if (!owner.includes('buildFaceDescriptor')) errors.push(`${ownerRel}: must expose buildFaceDescriptor`);
if (!owner.includes('layer: \'application/render\'') && !owner.includes('layer: "application/render"')) errors.push(`${ownerRel}: summarizeBoundary must identify application/render layer`);
if (index.indexOf(ownerRel) < 0) errors.push(`${indexRel}: missing ${ownerRel}`);
if (index.indexOf(builderRel) >= 0 && index.indexOf(ownerRel) > index.indexOf(builderRel)) errors.push(`${indexRel}: ${ownerRel} must load before ${builderRel}`);
if (!builder.includes('requireStaticWorldFaceDescriptorBuilder')) errors.push(`${builderRel}: must require descriptor owner`);
if (!builder.includes('.buildStaticWorldFaceDescriptors(')) errors.push(`${builderRel}: must delegate descriptor construction`);
if (/var\s+faceTiePrio\s*=/.test(builder)) errors.push(`${builderRel}: should not own face tie priority table`);
if (/for\s*\(var\s+vf\s*=\s*0;\s*vf\s*<\s*visibleFaces\.length;\s*vf\+\+\)\s*\{[\s\S]{1000,}?faceDescriptors\.push/.test(builder)) errors.push(`${builderRel}: still owns large visible face descriptor loop`);
for (const [pattern, reason] of [[/\bctx\s*\./, 'canvas context'], [/\bdocument\s*\./, 'DOM'], [/\blocalStorage\s*\./, 'localStorage'], [/\bnew\s+Image\b/, 'Image'], [/\bfetch\s*\(/, 'fetch']]) {
  if (pattern.test(owner)) errors.push(`${ownerRel}: forbidden ${reason}`);
}
const report = { status: errors.length ? 'FAIL' : 'PASS', ownerRel, builderRel, errors };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
