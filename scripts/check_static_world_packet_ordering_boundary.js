#!/usr/bin/env node
/* P12c static world packet ordering boundary check. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const errors = [];
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
const ownerRel = 'src/application/render/static-world-packet-ordering.js';
const builderRel = 'src/application/render/static-world-renderable-builder.js';
const indexRel = 'index.html';
if (!exists(ownerRel)) errors.push(`missing ${ownerRel}`);
if (!exists(builderRel)) errors.push(`missing ${builderRel}`);
const owner = exists(ownerRel) ? read(ownerRel) : '';
const builder = exists(builderRel) ? read(builderRel) : '';
const index = exists(indexRel) ? read(indexRel) : '';
if (!owner.includes('buildStaticWorldPacketIdentity')) errors.push(`${ownerRel}: must expose buildStaticWorldPacketIdentity`);
if (!owner.includes('sortStaticWorldPackets')) errors.push(`${ownerRel}: must expose sortStaticWorldPackets`);
if (!owner.includes('layer: \'application/render\'') && !owner.includes('layer: "application/render"')) errors.push(`${ownerRel}: summarizeBoundary must identify application/render layer`);
if (index.indexOf(ownerRel) < 0) errors.push(`${indexRel}: missing ${ownerRel}`);
if (index.indexOf(builderRel) >= 0 && index.indexOf(ownerRel) > index.indexOf(builderRel)) errors.push(`${indexRel}: ${ownerRel} must load before ${builderRel}`);
if (!builder.includes('requireStaticWorldPacketOrdering')) errors.push(`${builderRel}: must require packet ordering owner`);
if (!builder.includes('.buildStaticWorldPacketIdentity(')) errors.push(`${builderRel}: must delegate packet identity`);
if (!builder.includes('.sortStaticWorldPackets(')) errors.push(`${builderRel}: must delegate packet sorting`);
if (builder.includes('packets.sort(compareRenderablesByDomain)')) errors.push(`${builderRel}: should not sort packets directly`);
for (const [pattern, reason] of [[/\bctx\s*\./, 'canvas context'], [/\bdocument\s*\./, 'DOM'], [/\blocalStorage\s*\./, 'localStorage'], [/\bnew\s+Image\b/, 'Image'], [/\bfetch\s*\(/, 'fetch']]) {
  if (pattern.test(owner)) errors.push(`${ownerRel}: forbidden ${reason}`);
}
const report = { status: errors.length ? 'FAIL' : 'PASS', ownerRel, builderRel, errors };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
