const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectRoot = path.resolve(__dirname, '..');
const sandbox = { console };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
sandbox.__APP_NAMESPACE = { bind() {}, getPath() { return null; } };
vm.createContext(sandbox);

for (const rel of ['src/core/domain/item-facing-core.js', 'src/core/domain/render-face-oracle-core.js']) {
  const code = fs.readFileSync(path.join(projectRoot, rel), 'utf8');
  vm.runInContext(code, sandbox, { filename: rel });
}

const facingApi = sandbox.__ITEM_FACING_CORE__;
const oracleApi = sandbox.__RENDER_FACE_ORACLE_CORE__;
if (!facingApi || !oracleApi) throw new Error('missing core apis');

const cubePrefab = {
  id: 'cube_1x1',
  semanticTextures: {
    top: { textureId: 'top' },
    north: { textureId: 'north' },
    east: { textureId: 'east' },
    south: { textureId: 'south' },
    west: { textureId: 'west' }
  }
};

function makeOccupiedSet(cubes) {
  const set = new Set();
  cubes.forEach((cube) => set.add(`${cube.x},${cube.y},${cube.z}`));
  return set;
}

function runScene(def, rotation) {
  const cubes = def.cubes.map((cube) => ({ ...cube }));
  const cells = cubes.map((cube) => ({ x: cube.x, y: cube.y, z: cube.z }));
  const occupiedSet = makeOccupiedSet(cubes);
  const renderData = facingApi.buildDebugCuboidFaceRenderables({
    prefab: cubePrefab,
    cells,
    itemFacing: 0,
    viewRotation: rotation,
    ownerId: def.sceneId,
    occupiedSet,
  });
  const actualFaces = (renderData.faceRenderables || []).map((face, drawIndex) => ({
    instanceId: (cubes.find((cube) => cube.x === face.cell.x && cube.y === face.cell.y && cube.z === face.cell.z) || {}).instanceId || 'unknown',
    semanticFace: face.semanticFace,
    screenFace: face.screenFace,
    drawIndex,
    cellX: face.cell.x,
    cellY: face.cell.y,
    cellZ: face.cell.z,
  }));
  return oracleApi.runOracleCheck(def.sceneId, rotation, actualFaces);
}

const defs = oracleApi.getOracleTestSceneDefinitions();
const result = {};
for (const key of ['A', 'B', 'C']) {
  result[key] = {};
  for (let rotation = 0; rotation < 4; rotation += 1) result[key][rotation] = runScene(defs[key], rotation);
}
console.log(JSON.stringify(result, null, 2));
