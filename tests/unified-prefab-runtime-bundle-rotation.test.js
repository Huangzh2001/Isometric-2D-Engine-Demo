const fs = require('fs');
const vm = require('vm');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function near(a,b){ return Math.abs(Number(a)-Number(b)) < 1e-9; }
const bundle = fs.readFileSync('dist/bundles/main-1.bundle.js','utf8');
const owner = "var OWNER = 'src/core/domain/item-facing-core.js';";
let ownerAt = bundle.indexOf(owner);
assert(ownerAt >= 0, 'main-1 bundle must contain updated item-facing owner source');
let start = bundle.lastIndexOf('(function () {', ownerAt);
if (start < 0) start = bundle.lastIndexOf('(function(){', ownerAt);
const next = bundle.indexOf("var OWNER='src/core/domain/isometric-face-core.js'", ownerAt);
assert(start >= 0 && next > ownerAt, 'must isolate bundled item-facing module');
const end = bundle.lastIndexOf('})();', next);
assert(end > ownerAt, 'must find bundled item-facing module end');
const moduleCode = bundle.slice(start, end + 5);
const context = { window:{__APP_NAMESPACE:{bind(){}}}, console, Math, Number, String, Object, Array, JSON, Map, Set };
vm.createContext(context);
vm.runInContext(moduleCode, context, {filename:'main-1.item-facing.bundle.js'});
const api = context.window.__ITEM_FACING_CORE__;
assert(api, 'bundled item-facing API must initialize');
const prefab = {
  id:'bundle-offset', hzhUnifiedRuntime:true,
  anchor:{x:4,y:3,z:0},
  voxels:[{x:5,y:3,z:0,w:1,d:1,h:1}],
  sprite:{relativeVoxelAlignment:{version:'test'}}
};
const frame = api.getPrefabLocalFrame(prefab);
assert(frame.rotationSpace === 'editor-anchor-corner', 'bundle must use editor-anchor-corner');
assert(near(frame.origin.x,4) && near(frame.origin.y,3), 'bundle must use authored anchor as local origin');
const f1 = api.rotateVoxelList(prefab,1)[0];
const f3 = api.rotateVoxelList(prefab,3)[0];
assert(near(f1.x,-1) && near(f1.y,1), `bundle f1 must match editor transform, got ${JSON.stringify(f1)}`);
assert(near(f3.x,0) && near(f3.y,-2), `bundle f3 must match editor transform, got ${JSON.stringify(f3)}`);
console.log('unified-prefab-runtime-bundle-rotation.test.js: OK');
