#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const renderText = fs.readFileSync(path.join(root, 'src/presentation/render/render.js'), 'utf8');
const coreSceneText = fs.readFileSync(path.join(root, 'src/core/domain/scene-domain-core.js'), 'utf8');

const removedRenderDeclarations = [
  'projectedBounds',
  'buildBoxFaces',
  'highestTopAtCell',
  'isMainEditorCameraCullingEnabledForRender',
  'getMainCameraVisibleBoxesForRender',
  'isActorInteractionSingleColumnTallGroup',
  'areAllActorInteractionPacketKeysHit',
  'accumulateRenderFunctionTiming',
];

for (const name of removedRenderDeclarations) {
  assert(
    !new RegExp('function\\s+' + name + '\\s*\\(').test(renderText),
    `${name} should not be reintroduced as a render.js declaration`
  );
}

assert(
  /function\s+highestTopAtCellFromIndex\s*\(/.test(coreSceneText),
  'core scene-domain column-top helper should remain intact; P12b-0 only removes the stale render.js highestTopAtCell copy'
);

assert(
  /function\s+recordRenderFunctionTiming\s*\(/.test(renderText),
  'active render function timing path should remain; only stale accumulateRenderFunctionTiming was pruned'
);

console.log('PASS render-dead-code-pruning');
