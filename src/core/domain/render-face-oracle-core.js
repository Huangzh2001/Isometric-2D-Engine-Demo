(function (root) {
  if (!root) return;

  var OWNER = 'src/core/domain/render-face-oracle-core.js';
  var PHASE = 'MAIN-RENDER-FACE-ORACLE-V1';

  function toNumber(value, fallback) {
    var num = Number(value);
    return Number.isFinite(num) ? num : Number(fallback || 0);
  }

  function normalizeViewRotation(value) {
    return ((Math.round(toNumber(value, 0)) % 4) + 4) % 4;
  }

  function rotateOffset(dx, dy, rotation) {
    switch (normalizeViewRotation(rotation)) {
      case 1: return { x: dy, y: -dx };
      case 2: return { x: -dx, y: -dy };
      case 3: return { x: -dy, y: dx };
      default: return { x: dx, y: dy };
    }
  }

  var SINGLE_VOXEL_FACE_ORACLE = Object.freeze({
    0: Object.freeze({
      visibleSemanticFaces: Object.freeze(['east', 'south', 'top']),
      canonicalDrawOrder: Object.freeze(['east', 'south', 'top']),
      screenFaceToSemanticFace: Object.freeze({ lowerLeft: 'south', lowerRight: 'east', top: 'top' })
    }),
    1: Object.freeze({
      visibleSemanticFaces: Object.freeze(['south', 'west', 'top']),
      canonicalDrawOrder: Object.freeze(['south', 'west', 'top']),
      screenFaceToSemanticFace: Object.freeze({ lowerLeft: 'west', lowerRight: 'south', top: 'top' })
    }),
    2: Object.freeze({
      visibleSemanticFaces: Object.freeze(['west', 'north', 'top']),
      canonicalDrawOrder: Object.freeze(['west', 'north', 'top']),
      screenFaceToSemanticFace: Object.freeze({ lowerLeft: 'north', lowerRight: 'west', top: 'top' })
    }),
    3: Object.freeze({
      visibleSemanticFaces: Object.freeze(['north', 'east', 'top']),
      canonicalDrawOrder: Object.freeze(['north', 'east', 'top']),
      screenFaceToSemanticFace: Object.freeze({ lowerLeft: 'east', lowerRight: 'north', top: 'top' })
    })
  });

  function invertFaceMap(map) {
    var out = {};
    Object.keys(map || {}).forEach(function (screenFace) {
      if (map[screenFace]) out[map[screenFace]] = screenFace;
    });
    return out;
  }

  function getSingleVoxelTruth(viewRotation) {
    var rot = normalizeViewRotation(viewRotation);
    var src = SINGLE_VOXEL_FACE_ORACLE[rot];
    return {
      viewRotation: rot,
      visibleSemanticFaces: src.visibleSemanticFaces.slice(),
      canonicalDrawOrder: src.canonicalDrawOrder.slice(),
      screenFaceToSemanticFace: Object.assign({}, src.screenFaceToSemanticFace),
      semanticFaceToScreenFace: invertFaceMap(src.screenFaceToSemanticFace)
    };
  }

  function semanticOrderPriority(rotation, semanticFace) {
    var truth = getSingleVoxelTruth(rotation);
    var idx = truth.canonicalDrawOrder.indexOf(String(semanticFace || ''));
    return idx >= 0 ? idx : 99;
  }

  function semanticNeighborDelta(semanticFace) {
    switch (String(semanticFace || '').toLowerCase()) {
      case 'east': return { x: 1, y: 0, z: 0 };
      case 'south': return { x: 0, y: 1, z: 0 };
      case 'west': return { x: -1, y: 0, z: 0 };
      case 'north': return { x: 0, y: -1, z: 0 };
      case 'top': return { x: 0, y: 0, z: 1 };
      default: return { x: 0, y: 0, z: 0 };
    }
  }

  function faceWorldPolygon(cell, semanticFace) {
    var c = cell || {};
    var x = toNumber(c.x, 0), y = toNumber(c.y, 0), z = toNumber(c.z, 0);
    if (semanticFace === 'top') return [
      { x: x, y: y, z: z + 1 }, { x: x + 1, y: y, z: z + 1 }, { x: x + 1, y: y + 1, z: z + 1 }, { x: x, y: y + 1, z: z + 1 }
    ];
    if (semanticFace === 'east') return [
      { x: x + 1, y: y, z: z }, { x: x + 1, y: y + 1, z: z }, { x: x + 1, y: y + 1, z: z + 1 }, { x: x + 1, y: y, z: z + 1 }
    ];
    if (semanticFace === 'south') return [
      { x: x, y: y + 1, z: z }, { x: x + 1, y: y + 1, z: z }, { x: x + 1, y: y + 1, z: z + 1 }, { x: x, y: y + 1, z: z + 1 }
    ];
    if (semanticFace === 'north') return [
      { x: x, y: y, z: z + 1 }, { x: x + 1, y: y, z: z + 1 }, { x: x + 1, y: y, z: z }, { x: x, y: y, z: z }
    ];
    if (semanticFace === 'west') return [
      { x: x, y: y, z: z + 1 }, { x: x, y: y + 1, z: z + 1 }, { x: x, y: y + 1, z: z }, { x: x, y: y, z: z }
    ];
    return [];
  }

  function projectUnitIso(point) {
    var p = point || {};
    var x = toNumber(p.x, 0), y = toNumber(p.y, 0), z = toNumber(p.z, 0);
    return { x: x - y, y: (x + y) * 0.5 - z };
  }

  function averagePoint(points) {
    var list = Array.isArray(points) ? points : [];
    if (!list.length) return { x: 0, y: 0 };
    var sx = 0, sy = 0;
    for (var i = 0; i < list.length; i++) { sx += toNumber(list[i].x, 0); sy += toNumber(list[i].y, 0); }
    return { x: sx / list.length, y: sy / list.length };
  }

  function computeBBox(points) {
    var list = Array.isArray(points) ? points : [];
    if (!list.length) return null;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < list.length; i++) {
      var x = toNumber(list[i].x, NaN), y = toNumber(list[i].y, NaN);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  function cellKey(cell) {
    var c = cell || {};
    return [toNumber(c.x, 0), toNumber(c.y, 0), toNumber(c.z, 0)].join(',');
  }

  function hasOccupiedCell(sceneCellsMap, x, y, z) {
    return !!sceneCellsMap[[toNumber(x, 0), toNumber(y, 0), toNumber(z, 0)].join(',')];
  }

  function getOracleTestSceneDefinitions() {
    return {
      A: {
        sceneId: 'scene-A-single-cube',
        cubes: [{ instanceId: 'cubeA', prefabId: 'cube_1x1', x: 0, y: 0, z: 0 }]
      },
      B: {
        sceneId: 'scene-B-adjacent-cubes',
        cubes: [
          { instanceId: 'cubeA', prefabId: 'cube_1x1', x: 0, y: 0, z: 0 },
          { instanceId: 'cubeB', prefabId: 'cube_1x1', x: 1, y: 0, z: 0 }
        ]
      },
      C: {
        sceneId: 'scene-C-stacked-cubes',
        cubes: [
          { instanceId: 'cubeA', prefabId: 'cube_1x1', x: 0, y: 0, z: 0 },
          { instanceId: 'cubeB', prefabId: 'cube_1x1', x: 0, y: 0, z: 1 }
        ]
      }
    };
  }

  function buildOracleSceneFaces(sceneOrId, rotation) {
    var defs = getOracleTestSceneDefinitions();
    var scene = typeof sceneOrId === 'string'
      ? (defs[sceneOrId] || Object.keys(defs).map(function (k) { return defs[k]; }).find(function (d) { return d.sceneId === sceneOrId; }) || null)
      : sceneOrId;
    if (!scene || !Array.isArray(scene.cubes)) return { sceneId: null, rotation: normalizeViewRotation(rotation), faces: [], expectedOrder: [] };
    var rot = normalizeViewRotation(rotation);
    var truth = getSingleVoxelTruth(rot);
    var sceneCellsMap = Object.create(null);
    scene.cubes.forEach(function (cube) { sceneCellsMap[cellKey(cube)] = true; });
    var faces = [];
    scene.cubes.forEach(function (cube, cubeIndex) {
      ['lowerRight', 'lowerLeft', 'top'].forEach(function (screenFace) {
        var semanticFace = truth.screenFaceToSemanticFace[screenFace] || null;
        if (!semanticFace) return;
        var delta = semanticNeighborDelta(semanticFace);
        if (hasOccupiedCell(sceneCellsMap, cube.x + delta.x, cube.y + delta.y, cube.z + delta.z)) return;
        var polygon = faceWorldPolygon(cube, semanticFace);
        var projected = polygon.map(projectUnitIso);
        var centroid = averagePoint(projected);
        var bbox = computeBBox(projected);
        faces.push({
          faceKey: [cube.instanceId || ('cube' + cubeIndex), cellKey(cube), semanticFace, screenFace].join('|'),
          instanceId: cube.instanceId || ('cube' + cubeIndex),
          prefabId: cube.prefabId || 'cube_1x1',
          cell: { x: cube.x, y: cube.y, z: cube.z },
          semanticFace: semanticFace,
          screenFace: screenFace,
          projectedPolygon: projected,
          centroid: centroid,
          bbox: bbox,
          oraclePriority: semanticOrderPriority(rot, semanticFace)
        });
      });
    });
    faces.sort(function (a, b) {
      var ar = rotateOffset(a.cell.x, a.cell.y, rot);
      var br = rotateOffset(b.cell.x, b.cell.y, rot);
      var aDepth = ar.x + ar.y + a.cell.z;
      var bDepth = br.x + br.y + b.cell.z;
      if (aDepth !== bDepth) return aDepth - bDepth;
      if (a.oraclePriority !== b.oraclePriority) return a.oraclePriority - b.oraclePriority;
      if (Math.abs(a.centroid.y - b.centroid.y) > 1e-9) return a.centroid.y - b.centroid.y;
      if (Math.abs(a.centroid.x - b.centroid.x) > 1e-9) return a.centroid.x - b.centroid.x;
      return String(a.faceKey).localeCompare(String(b.faceKey));
    });
    return {
      sceneId: scene.sceneId || null,
      rotation: rot,
      truth: truth,
      faces: faces,
      expectedOrder: faces.map(function (face) { return face.faceKey; })
    };
  }

  function identifyOracleTestScene(input) {
    var defs = getOracleTestSceneDefinitions();
    var cubes = [];
    (Array.isArray(input) ? input : []).forEach(function (entry) {
      if (!entry) return;
      var prefabId = entry.prefabId || entry.prefab || null;
      if (prefabId !== 'cube_1x1') return;
      cubes.push({ instanceId: entry.instanceId || null, x: toNumber(entry.x, 0), y: toNumber(entry.y, 0), z: toNumber(entry.z, 0) });
    });
    var sig = cubes.map(function (c) { return [c.x, c.y, c.z].join(','); }).sort().join('|');
    if (sig === '0,0,0') return defs.A;
    if (sig === '0,0,0|1,0,0') return defs.B;
    if (sig === '0,0,0|0,0,1') return defs.C;
    return null;
  }

  function normalizeActualFaceEntries(actualFaces) {
    return (Array.isArray(actualFaces) ? actualFaces : []).map(function (face, index) {
      var cell = face && face.cell ? face.cell : { x: face.cellX, y: face.cellY, z: face.cellZ };
      return {
        faceKey: face && face.faceKey ? face.faceKey : [face.instanceId || 'unknown', cellKey(cell), face.semanticFace || '', face.screenFace || ''].join('|'),
        instanceId: face && face.instanceId || null,
        semanticFace: face && face.semanticFace || null,
        screenFace: face && face.screenFace || null,
        drawIndex: face && typeof face.drawIndex === 'number' ? face.drawIndex : index,
        cell: { x: toNumber(cell && cell.x, 0), y: toNumber(cell && cell.y, 0), z: toNumber(cell && cell.z, 0) }
      };
    }).sort(function (a, b) { return a.drawIndex - b.drawIndex; });
  }

  function runOracleCheck(sceneOrId, rotation, actualFaces) {
    var expected = buildOracleSceneFaces(sceneOrId, rotation);
    var actual = normalizeActualFaceEntries(actualFaces);
    var actualOrder = actual.map(function (face) { return face.faceKey; });
    var expectedOrder = expected.expectedOrder.slice();
    var passed = expectedOrder.length === actualOrder.length;
    if (passed) {
      for (var i = 0; i < expectedOrder.length; i++) {
        if (expectedOrder[i] !== actualOrder[i]) { passed = false; break; }
      }
    }
    return {
      testSceneId: expected.sceneId,
      currentViewRotation: expected.rotation,
      comparedFaces: actual.map(function (face) {
        return {
          faceKey: face.faceKey,
          instanceId: face.instanceId,
          semanticFace: face.semanticFace,
          screenFace: face.screenFace,
          drawIndex: face.drawIndex,
          cell: face.cell
        };
      }),
      expectedOrder: expectedOrder,
      actualOrder: actualOrder,
      passed: passed
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    SINGLE_VOXEL_FACE_ORACLE: SINGLE_VOXEL_FACE_ORACLE,
    getSingleVoxelTruth: getSingleVoxelTruth,
    getOracleTestSceneDefinitions: getOracleTestSceneDefinitions,
    identifyOracleTestScene: identifyOracleTestScene,
    buildOracleSceneFaces: buildOracleSceneFaces,
    runOracleCheck: runOracleCheck
  };

  root.__RENDER_FACE_ORACLE_CORE__ = api;
  if (root.__APP_NAMESPACE && typeof root.__APP_NAMESPACE.bind === 'function') {
    root.__APP_NAMESPACE.bind('domain.renderFaceOracleCore', api, { owner: OWNER, phase: PHASE });
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
