#!/usr/bin/env node
/*
 * P12b-0 guardrail: high-confidence unused render.js legacy declarations
 * must stay removed. This check intentionally scans render.js only because a
 * few names still appear in archival docs or in core owners with different
 * ownership.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const renderPath = path.join(root, 'src/presentation/render/render.js');
const renderText = fs.readFileSync(renderPath, 'utf8');

const removedDeclarations = [
  'projectedBounds',
  'buildBoxFaces',
  'highestTopAtCell',
  'isMainEditorCameraCullingEnabledForRender',
  'getMainCameraVisibleBoxesForRender',
  'isActorInteractionSingleColumnTallGroup',
  'areAllActorInteractionPacketKeysHit',
  'accumulateRenderFunctionTiming',
];

const offenders = [];
for (const name of removedDeclarations) {
  const declaration = new RegExp('function\\s+' + name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '\\s*\\(');
  if (declaration.test(renderText)) offenders.push(name);
}

if (offenders.length) {
  console.error('FAIL P12b-0 render dead-code pruning boundary');
  console.error('These high-confidence unused legacy declarations must not be reintroduced in render.js:');
  for (const name of offenders) console.error('- ' + name);
  process.exit(1);
}

console.log('PASS P12b-0 render dead-code pruning boundary');
