const fs = require('fs');
const path = require('path');
const vm = require('vm');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function runFile(context, relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
  vm.runInContext(code, context, { filename: relPath });
}

const context = { window: {}, console, Math, Number, String, Object, Array, JSON };
vm.createContext(context);
runFile(context, 'src/core/domain/scene-domain-core.js');
const api = context.__APP_CORE_SCENE_DOMAIN_CORE__;
assert(api && typeof api.computeSpriteRenderableSort === 'function', 'scene core sprite sort API missing');

// A tall atomic sprite must sort by its ground anchor, not by its visual height.
// For every camera rotation, place the player exactly one projected ground-depth
// step in front of the sprite. The player must therefore draw after the sprite.
const sprite = { x: 10, y: 10, z: 0, h: 4, viewRotation: 0 };
const frontDeltaByView = {
  0: { x: 1, y: 0 },      // x+y increases
  1: { x: 0, y: 1 },      // y-x increases
  2: { x: -1, y: 0 },     // -x-y increases
  3: { x: 1, y: 0 }       // x-y increases
};

for (let viewRotation = 0; viewRotation < 4; viewRotation++) {
  const d = frontDeltaByView[viewRotation];
  const spriteSort = api.computeSpriteRenderableSort({
    x: sprite.x,
    y: sprite.y,
    z: sprite.z,
    h: sprite.h,
    viewRotation,
    sortMode: 'box_occlusion'
  });
  const playerSort = api.computePlayerActorRenderableSort({
    player: { x: sprite.x + d.x, y: sprite.y + d.y, z: 0 },
    viewRotation
  });
  assert(spriteSort.sortAnchorMode === 'sprite-foot-anchor', 'sprite should expose foot-anchor sort mode');
  assert(spriteSort.visualHeightExcludedFromDepth === true, 'sprite visual height must be excluded from depth');
  assert(api.compareRenderableOrder(spriteSort, playerSort) < 0,
    'viewRotation=' + viewRotation + ': player on nearer ground tile must draw in front of tall sprite');
}

// Height is a visual/collision property, not an atomic-sprite ground-depth bias.
const shortSort = api.computeSpriteRenderableSort({ x: 3, y: 4, z: 0, h: 1, viewRotation: 2 });
const tallSort = api.computeSpriteRenderableSort({ x: 3, y: 4, z: 0, h: 8, viewRotation: 2 });
assert(Math.abs(shortSort.sortKey - tallSort.sortKey) < 1e-9, 'atomic sprite sortKey must not change with visual height');

// The shipped runtime bundle must contain the same foot-anchor rule.
const bundle = fs.readFileSync(path.join(__dirname, '..', 'dist/bundles/main-1.bundle.js'), 'utf8');
assert(bundle.includes("sortAnchorMode:'sprite-foot-anchor'"), 'main-1 bundle must ship sprite foot-anchor depth sorting');
assert(bundle.includes('computeViewAwareSortMeta(depthAnchor,0,viewRotation,sortBias)'), 'main-1 bundle must exclude visual height from sprite depth');

console.log('prefab-sprite-player-view-depth-sort.test.js: OK');
