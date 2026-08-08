(function (global) {
  'use strict';

  var params = new URLSearchParams(global.location.search || '');
  var embeddedTest = params.get('embeddedBehaviorTest') === '1';

  var VERSION = 'HZH-BEHAVIOR-RUNTIME-V6';
  var logicalPrefabs = new Map();
  var stateVariants = new Map();
  var pendingImports = [];
  var mainReady = false;

  function post(type, payload) {
    if (!embeddedTest) return;
    try {
      if (global.parent && global.parent !== global) {
        global.parent.postMessage(Object.assign({ type: type, source: VERSION }, payload || {}), global.location.origin);
      }
    } catch (_) {}
  }
  function log(message, kind) { post('HZH_TEST_LOG', { message: String(message || ''), kind: kind || 'info' }); }
  function safeClone(v) { try { return JSON.parse(JSON.stringify(v)); } catch (_) { return v; } }
  function appPath(path) {
    try {
      var cur = global.App;
      String(path || '').split('.').forEach(function (key) { if (key) cur = cur && cur[key]; });
      return cur || null;
    } catch (_) { return null; }
  }
  function registry() { return appPath('state.prefabRegistry') || global.__PREFAB_REGISTRY_API__ || null; }
  function placement() { return appPath('application.placementBoundary') || appPath('application.placementCore') || global.__PLACEMENT_CORE_API__ || null; }
  function sceneSession() { return appPath('state.sceneSession') || global.__SCENE_SESSION_STATE__ || null; }
  function assetImport() { return appPath('application.assetImport') || global.__ASSET_IMPORT_API__ || null; }
  function controllers() { return appPath('controllers.placement') || null; }
  function pixelCore() { return global.__HZH_PIXEL_ART_CORE__ || appPath('core.pixelArt') || null; }

  function stateBundle(prefab) {
    var bundle = prefab && prefab.materialStates;
    return bundle && Array.isArray(bundle.states) ? bundle : { activeStateId: '', states: [] };
  }
  function stateById(prefab, stateId) {
    var b = stateBundle(prefab);
    return b.states.find(function (s) { return String(s.id) === String(stateId); }) || null;
  }
  function initialStateId(prefab) {
    var b = stateBundle(prefab);
    return String(prefab.activeStateId || b.activeStateId || (b.states[0] && b.states[0].id) || 'default');
  }
  function runtimeVariantId(baseId, stateId) {
    return String(baseId) + '__hzh_state__' + encodeURIComponent(String(stateId)).replace(/%/g, '_');
  }

  function pixelsToDataUrl(pixels, width, height) {
    var c = document.createElement('canvas'); c.width = Math.max(1, width); c.height = Math.max(1, height);
    var ctx = c.getContext('2d');
    ctx.putImageData(new ImageData(pixels, c.width, c.height), 0, 0);
    return c.toDataURL('image/png');
  }

  function buildRuntimeLocalFrame(voxelDef, fallbackPrefab) {
    var voxels = voxelDef && Array.isArray(voxelDef.voxels) ? voxelDef.voxels : [];
    var rawAnchor = voxelDef && voxelDef.anchor ? voxelDef.anchor : (fallbackPrefab && fallbackPrefab.anchor ? fallbackPrefab.anchor : { x: 0, y: 0, z: 0 });

    // The voxel editor renders both artwork and voxel geometry from the
    // authored State anchor.  That anchor is therefore the only valid runtime
    // local origin.  A voxel drawn at (4,4) while anchor=(1,2) really is at
    // local (3,2); moving it back to occupied minX/minY changes the asset.
    var origin = {
      x: Number(rawAnchor && rawAnchor.x) || 0,
      y: Number(rawAnchor && rawAnchor.y) || 0,
      z: Number(rawAnchor && rawAnchor.z) || 0
    };

    var minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    voxels.forEach(function (v) {
      var x = Number(v && v.x) || 0, y = Number(v && v.y) || 0, z = Number(v && v.z) || 0;
      var w = Math.max(0.001, Number(v && v.w != null ? v.w : 1) || 1);
      var d = Math.max(0.001, Number(v && v.d != null ? v.d : 1) || 1);
      var h = Math.max(0.001, Number(v && v.h != null ? v.h : 1) || 1);
      minX = Math.min(minX, x); minY = Math.min(minY, y); minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + d); maxZ = Math.max(maxZ, z + h);
    });

    var stateW = Number.isFinite(maxX) && Number.isFinite(minX) ? Math.max(0.001, maxX - minX) : Math.max(1, Number(fallbackPrefab && fallbackPrefab.w) || 1);
    var stateD = Number.isFinite(maxY) && Number.isFinite(minY) ? Math.max(0.001, maxY - minY) : Math.max(1, Number(fallbackPrefab && fallbackPrefab.d) || 1);
    var stateH = Number.isFinite(maxZ) && Number.isFinite(minZ) ? Math.max(0.001, maxZ - minZ) : Math.max(1, Number(fallbackPrefab && fallbackPrefab.h) || 1);
    var localAnchor = { x: 0, y: 0, z: 0 };
    return {
      version: 'prefab-anchor-local-frame-v3',
      origin: origin,
      bounds: {
        w: Math.max(0.001, stateW, Number(fallbackPrefab && fallbackPrefab.w) || 0),
        d: Math.max(0.001, stateD, Number(fallbackPrefab && fallbackPrefab.d) || 0),
        h: Math.max(0.001, stateH, Number(fallbackPrefab && fallbackPrefab.h) || 0)
      },
      anchor: localAnchor,
      pivot: { x: 0, y: 0, z: 0 },
      rotationSpace: 'editor-anchor-corner'
    };
  }

  function buildRuntimeRelativeAlignment(frame, state, fallbackPrefab) {
    if (!frame) return null;
    var prior = fallbackPrefab && fallbackPrefab.sprite && fallbackPrefab.sprite.relativeVoxelAlignment;
    return {
      version: 'runtime-state-local-frame-alignment-v1',
      baseLayerZ: Number(frame.origin && frame.origin.z) || 0,
      removedEditorTranslation: {
        x: Number(frame.origin && frame.origin.x) || 0,
        y: Number(frame.origin && frame.origin.y) || 0
      },
      localBounds: {
        w: Math.max(0.001, Number(frame.bounds && frame.bounds.w) || 1),
        d: Math.max(0.001, Number(frame.bounds && frame.bounds.d) || 1)
      },
      normalizedAnchorCell: {
        x: Number(frame.anchor && frame.anchor.x) || 0,
        y: Number(frame.anchor && frame.anchor.y) || 0,
        z: Number(frame.anchor && frame.anchor.z) || 0
      },
      artwork: prior && prior.artwork ? safeClone(prior.artwork) : null,
      canonicalTile: prior && prior.canonicalTile ? safeClone(prior.canonicalTile) : { width: 64, height: 32 },
      facingTransforms: prior && Array.isArray(prior.facingTransforms) ? safeClone(prior.facingTransforms) : []
    };
  }

  function buildStateSpriteDirections(state, fallbackPrefab, runtimeAlignment) {
    var core = pixelCore();
    var serialized = state && state.artwork && Array.isArray(state.artwork.facings) ? state.artwork : (state && state.artwork && state.artwork.document ? state.artwork.document : null);
    if (!serialized || !core || typeof core.deserializeDocument !== 'function' || typeof core.compositeFacing !== 'function') {
      return safeClone(fallbackPrefab && fallbackPrefab.spriteDirections) || null;
    }
    try {
      var doc = core.deserializeDocument(serialized);
      var out = {};
      var transforms = state && state.sprite && Array.isArray(state.sprite.facingTransforms) ? state.sprite.facingTransforms : [];
      for (var facing = 0; facing < 4; facing++) {
        var transform = transforms.find(function (x) { return Number(x && x.facing) === facing; }) || {};
        var sourceFacing = Number.isFinite(Number(transform.sourceFacing)) ? Number(transform.sourceFacing) : facing;
        var pixels = core.compositeFacing(doc, sourceFacing);
        var scale = Number(transform.scale) || 1;
        // compositeFacing returns the same authored canvas used by the voxel
        // editor. Therefore its per-facing bottom-centre offset is already the
        // canonical image↔voxel relation. Re-deriving another offset from
        // registration metadata here double-applies alignment and causes the
        // runtime sprite to drift away from the authored voxel position.
        var offsetPx = {
          x: Number(transform.offsetPx && transform.offsetPx.x) || 0,
          y: Number(transform.offsetPx && transform.offsetPx.y) || 0
        };
        var registrationPx = serialized && serialized.metadata && serialized.metadata.registrationPx ? serialized.metadata.registrationPx : null;
        var alignment = runtimeAlignment || (fallbackPrefab && fallbackPrefab.sprite && fallbackPrefab.sprite.relativeVoxelAlignment);
        out[String(facing)] = {
          image: pixelsToDataUrl(pixels, doc.width, doc.height),
          fileName: (fallbackPrefab && fallbackPrefab.id ? fallbackPrefab.id : 'prefab') + '-' + String(state.id) + '-' + facing + '.png',
          width: doc.width,
          height: doc.height,
          scale: scale,
          offsetPx: offsetPx,
          registrationPx: registrationPx ? { x: Number(registrationPx.x) || 0, y: Number(registrationPx.y) || 0 } : null,
          anchorMode: 'bottom-center',
          sortMode: (fallbackPrefab && fallbackPrefab.sprite && fallbackPrefab.sprite.sortMode) || 'box_occlusion',
          flipX: !!transform.flipX,
          flipY: !!transform.flipY,
          relativeVoxelAlignment: safeClone(alignment) || null
        };
      }
      return out;
    } catch (err) {
      log('State 图片编译失败：' + String(err && err.message || err), 'warn');
      return safeClone(fallbackPrefab && fallbackPrefab.spriteDirections) || null;
    }
  }

  function compilePrefab(prefab) {
    var base = safeClone(prefab || {});
    if (!base || !base.id) throw new Error('Prefab 缺少 id');
    var bundle = stateBundle(base);
    var initial = initialStateId(base);
    var ids = {};
    bundle.states.forEach(function (s) { ids[String(s.id)] = runtimeVariantId(base.id, s.id); });
    if (bundle.states.length) ids[initial] = base.id;

    var variants = {};
    if (!bundle.states.length) {
      base.behaviorLogicalPrefabId = base.id;
      base.behaviorStateId = initial;
      base.behaviorStateVariants = {};
      var hasUnifiedRegistration = !!(
        (base.sprite && base.sprite.relativeVoxelAlignment) ||
        base.artworkStateBundle ||
        base.voxelStateBundle ||
        base.hzhUnifiedRuntime === true
      );
      if (base.kind !== 'habbo_import' || hasUnifiedRegistration) {
        base.hzhUnifiedRuntime = true;
        base.useLegacyHabboRuntime = false;
        if (!base.localFrame) base.localFrame = buildRuntimeLocalFrame({ voxels: base.voxels || [], anchor: base.anchor || { x: 0, y: 0, z: 0 } }, base);
      }
      variants[initial] = base;
      return { logical: base, initialStateId: initial, variants: variants, ids: ids };
    }

    bundle.states.forEach(function (state) {
      var isInitial = String(state.id) === String(initial);
      var v = safeClone(base);
      v.id = isInitial ? base.id : ids[String(state.id)];
      v.name = isInitial ? base.name : String(base.name || base.id) + ' · ' + String(state.name || state.id);
      v.runtimeHiddenFromPalette = !isInitial;
      v.behaviorLogicalPrefabId = base.id;
      v.behaviorStateId = String(state.id);
      v.behaviorStateVariants = safeClone(ids);
      // Once Habbo data has been converted into a unified .hzhmat State it is
      // a normal executable Prefab. Legacy SWF room-position anchoring must not
      // run a second time in the game renderer.
      v.hzhUnifiedRuntime = true;
      v.useLegacyHabboRuntime = false;
      if (state.voxel && Array.isArray(state.voxel.voxels)) v.voxels = safeClone(state.voxel.voxels);
      if (state.voxel && state.voxel.anchor) v.anchor = safeClone(state.voxel.anchor);
      v.localFrame = buildRuntimeLocalFrame(state.voxel || null, base);
      var stateAlignment = buildRuntimeRelativeAlignment(v.localFrame, state, base);
      var dirs = buildStateSpriteDirections(state, base, stateAlignment);
      if (dirs) {
        v.spriteDirections = dirs;
        v.sprite = dirs['0'] || dirs[0] || v.sprite;
        v.renderMode = 'sprite_proxy';
        v.renderUpdateMode = 'dynamic';
      }
      variants[String(state.id)] = v;
    });
    return { logical: base, initialStateId: initial, variants: variants, ids: ids };
  }

  function registerVisiblePrefab(compiled, select) {
    var ai = assetImport();
    var visible = compiled.variants[compiled.initialStateId] || compiled.logical;
    if (ai && typeof ai.importPrefabDefinition === 'function') {
      ai.importPrefabDefinition(visible, { source: 'behavior-main-test', sourceKind: 'behavior-test', persist: false, select: select !== false });
    } else {
      var reg = registry();
      if (!reg || typeof reg.registerPrefab !== 'function') throw new Error('主程序 Prefab Registry 未就绪');
      reg.registerPrefab(visible, { source: 'behavior-main-test' });
      if (select !== false && typeof reg.setSelectedPrefabId === 'function') reg.setSelectedPrefabId(visible.id, { source: 'behavior-main-test' });
      if (typeof reg.refreshPrototypeSelection === 'function') reg.refreshPrototypeSelection({ source: 'behavior-main-test' });
    }
    logicalPrefabs.set(String(compiled.logical.id), compiled.logical);
    Object.keys(compiled.variants).forEach(function (sid) {
      stateVariants.set(String(compiled.logical.id) + '::' + sid, compiled.variants[sid]);
    });
    if (select !== false) {
      var ctl = controllers();
      if (ctl && typeof ctl.requestModeChange === 'function') ctl.requestModeChange('place', { source: 'behavior-main-test:import' });
      else {
        var modePlace = document.getElementById('modePlace');
        if (modePlace) modePlace.click();
      }
    }
    log('已注入主素材栏：' + String(compiled.logical.name || compiled.logical.id), 'ok');
  }

  function registerHiddenVariant(def) {
    var reg = registry();
    if (!reg || !def) return null;
    if (typeof reg.getPrefabByIdExact === 'function' && reg.getPrefabByIdExact(def.id)) return reg.getPrefabByIdExact(def.id);
    if (typeof reg.registerPrefab === 'function') return reg.registerPrefab(def, { source: 'behavior-main-test:state-variant' });
    return null;
  }

  function getInstancePrefab(instance) {
    var reg = registry();
    if (!reg || !instance) return null;
    return typeof reg.getPrefabByIdExact === 'function' ? reg.getPrefabByIdExact(instance.prefabId) : (typeof reg.getPrefabById === 'function' ? reg.getPrefabById(instance.prefabId) : null);
  }
  function logicalIdForInstance(instance) {
    var p = getInstancePrefab(instance);
    return String((p && p.behaviorLogicalPrefabId) || (instance && instance.__hzhBehaviorLogicalPrefabId) || (instance && instance.prefabId) || '');
  }
  function stateIdForInstance(instance) {
    var p = getInstancePrefab(instance);
    return String((p && p.behaviorStateId) || (instance && instance.__hzhBehaviorStateId) || initialStateId(p || {}));
  }

  function switchInstanceState(instance, targetStateId) {
    if (!instance) return false;
    var logicalId = logicalIdForInstance(instance);
    var logical = logicalPrefabs.get(logicalId);
    if (!logical) {
      var current = getInstancePrefab(instance);
      logical = current || null;
      if (logical) {
        var firstCompiled = compilePrefab(logical);
        logicalPrefabs.set(logicalId, firstCompiled.logical);
        Object.keys(firstCompiled.variants).forEach(function (sid) {
          stateVariants.set(logicalId + '::' + sid, firstCompiled.variants[sid]);
        });
        logical = firstCompiled.logical;
      }
    }
    if (!logical) return false;
    var targetState = stateById(logical, targetStateId);
    if (stateBundle(logical).states.length && !targetState) {
      log(logicalId + '：不存在 State ' + targetStateId, 'error');
      return false;
    }
    var variant = stateVariants.get(logicalId + '::' + String(targetStateId));
    if (!variant && !stateBundle(logical).states.length) variant = logical;
    if (!variant) {
      var compiled = compilePrefab(logical);
      logicalPrefabs.set(logicalId, compiled.logical);
      Object.keys(compiled.variants).forEach(function (sid) {
        stateVariants.set(logicalId + '::' + sid, compiled.variants[sid]);
      });
      variant = compiled.variants[String(targetStateId)];
    }
    if (!variant) return false;
    registerHiddenVariant(variant);
    var before = stateIdForInstance(instance);
    instance.__hzhBehaviorLogicalPrefabId = logicalId;
    instance.__hzhBehaviorStateId = String(targetStateId);
    instance.prefabId = variant.id;
    var pApi = placement();
    if (pApi && typeof pApi.rebuildBoxesFromInstances === 'function') pApi.rebuildBoxesFromInstances({ source: 'behavior-main-test:setState' });
    try { if (typeof global.invalidateShadowGeometryCache === 'function') global.invalidateShadowGeometryCache('behavior-main-test:setState'); } catch (_) {}
    post('HZH_TEST_STATE_CHANGED', { instanceId: instance.instanceId || '', prefabId: logicalId, fromState: before, toState: String(targetStateId) });
    return true;
  }

  function parseFunctions(script) {
    var lines = String(script || '').replace(/\r/g, '').split('\n'), functions = Object.create(null);
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].trim().match(/^function\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*$/);
      if (!m) continue;
      var depth = 1, body = [], j = i + 1;
      for (; j < lines.length; j++) {
        var t = lines[j].trim();
        if (/^function\b/.test(t) || /^if\b.*\bthen\s*$/.test(t) || /^for\b.*\bdo\s*$/.test(t) || /^while\b.*\bdo\s*$/.test(t)) depth++;
        if (/^end\s*$/.test(t)) { depth--; if (depth === 0) break; }
        body.push(lines[j]);
      }
      functions[m[1]] = { lines: body };
      i = j;
    }
    return functions;
  }
  function luaString(expr) { var m = String(expr || '').trim().match(/^["']([\s\S]*)["']$/); return m ? m[1] : null; }
  function findIfBoundary(lines, start) {
    var depth = 0, elseAt = -1;
    for (var i = start + 1; i < lines.length; i++) {
      var t = lines[i].trim();
      if (/^if\b.*\bthen\s*$/.test(t)) depth++;
      if (/^end\s*$/.test(t)) { if (depth === 0) return { elseAt: elseAt, endAt: i }; depth--; }
      if (/^else\s*$/.test(t) && depth === 0) elseAt = i;
    }
    return { elseAt: -1, endAt: lines.length - 1 };
  }
  function behaviorScript(instance) {
    var p = getInstancePrefab(instance);
    return String(p && p.behavior && p.behavior.script || '');
  }
  function findInstanceByLogicalPrefab(id) {
    var session = sceneSession();
    var list = session && typeof session.getInstances === 'function' ? session.getInstances() : (Array.isArray(global.instances) ? global.instances : []);
    return (list || []).find(function (inst) { return logicalIdForInstance(inst) === String(id); }) || null;
  }
  function executeFunction(instance, name, depth) {
    depth = Number(depth || 0);
    if (depth > 24) { log('行为调用深度超过限制', 'error'); return; }
    var funcs = parseFunctions(behaviorScript(instance));
    var fn = funcs[name];
    if (!fn) { log(logicalIdForInstance(instance) + ' 没有实现 ' + name + '()', 'warn'); return; }
    log(logicalIdForInstance(instance) + ' → ' + name + '()', 'call');
    executeLines(instance, funcs, fn.lines, depth + 1);
  }
  function executeLines(instance, funcs, lines, depth) {
    for (var i = 0; i < lines.length; i++) {
      var t = String(lines[i] || '').trim();
      if (!t || t.indexOf('--') === 0) continue;
      var ifm = t.match(/^if\s+self:getState\(\)\s*(==|~=)\s*(["'][^"']*["'])\s*then\s*$/);
      if (ifm) {
        var boundary = findIfBoundary(lines, i), expected = luaString(ifm[2]);
        var cond = stateIdForInstance(instance) === String(expected); if (ifm[1] === '~=') cond = !cond;
        var start = i + 1, end = boundary.elseAt >= 0 ? boundary.elseAt : boundary.endAt;
        if (!cond && boundary.elseAt >= 0) { start = boundary.elseAt + 1; end = boundary.endAt; }
        if (cond || boundary.elseAt >= 0) executeLines(instance, funcs, lines.slice(start, end), depth + 1);
        i = boundary.endAt; continue;
      }
      var m = t.match(/^self:setState\((.+)\)\s*;?$/);
      if (m) { var sid = luaString(m[1]); if (sid != null) switchInstanceState(instance, sid); continue; }
      m = t.match(/^self:emit\(([^,)]+)(?:,.*)?\)\s*;?$/);
      if (m) { log(logicalIdForInstance(instance) + ' emits ' + (luaString(m[1]) || m[1]), 'event'); continue; }
      m = t.match(/^world:findByPrefab\(([^)]+)\):([A-Za-z_]\w*)\(([^)]*)\)\s*;?$/);
      if (m) {
        var pid = luaString(m[1]), target = findInstanceByLogicalPrefab(pid);
        if (!target) log('world:findByPrefab(' + pid + ')：场景中没有实例', 'warn'); else executeFunction(target, m[2], depth + 1);
        continue;
      }
      m = t.match(/^([A-Za-z_]\w*)\(([^)]*)\)\s*;?$/);
      if (m && funcs[m[1]]) { executeFunction(instance, m[1], depth + 1); continue; }
      if (/^else\s*$/.test(t) || /^end\s*$/.test(t)) continue;
      log('Test Runtime 暂不支持：' + t, 'warn');
    }
  }

  function findInstanceByRuntimeId(instanceId) {
    var id = String(instanceId || '');
    if (!id) return null;
    var session = sceneSession();
    var list = session && typeof session.getInstances === 'function' ? session.getInstances() : (global.instances || []);
    if (!Array.isArray(list)) return null;
    return list.find(function (instance) { return String(instance && instance.instanceId || '') === id; }) || null;
  }

  function pickInstanceFromMouseEvent(e) {
    var canvas = document.getElementById('game');
    if (!canvas) return null;
    var rect = canvas.getBoundingClientRect();
    // Exactly the same CSS -> logical-screen conversion used by the main
    // canvas input path in app.js.
    var logicalW = Number(global.VIEW_W) || Number(canvas.clientWidth) || Number(rect.width) || 1;
    var logicalH = Number(global.VIEW_H) || Number(canvas.clientHeight) || Number(rect.height) || 1;
    var sx = (e.clientX - rect.left) * (logicalW / Math.max(1, Number(rect.width) || 1));
    var sy = (e.clientY - rect.top) * (logicalH / Math.max(1, Number(rect.height) || 1));

    // Use the canonical sprite renderer's exact visual hit test first. Unified
    // material canvases often contain large transparent margins, so rectangle
    // bounds alone make Behavior fire beside the visible object.
    var spriteRenderer = global.__APP_PRESENTATION_PREFAB_SPRITE_RENDERER__ || global.__PREFAB_SPRITE_RENDERER__ || null;
    if (spriteRenderer && (
      typeof spriteRenderer.hitTestPrefabSpriteAtScreen === 'function' ||
      typeof spriteRenderer.getPrefabSpriteScreenBounds === 'function'
    )) {
      var session = sceneSession();
      var instancesList = session && typeof session.getInstances === 'function' ? session.getInstances() : (global.instances || []);
      var bestVisual = null;
      if (Array.isArray(instancesList)) {
        instancesList.forEach(function (candidate) {
          var candidatePrefab = getInstancePrefab(candidate);
          if (!candidatePrefab) return;
          var visualHit = typeof spriteRenderer.hitTestPrefabSpriteAtScreen === 'function'
            ? spriteRenderer.hitTestPrefabSpriteAtScreen(candidate, candidatePrefab, sx, sy, { alphaThreshold: 8 })
            : null;
          if (!visualHit && typeof spriteRenderer.hitTestPrefabSpriteAtScreen !== 'function') {
            var bounds = spriteRenderer.getPrefabSpriteScreenBounds(candidate, candidatePrefab);
            if (bounds && sx >= bounds.x && sx < bounds.x + bounds.width && sy >= bounds.y && sy < bounds.y + bounds.height) {
              visualHit = { hit: true, bounds: bounds, source: 'legacy-bounds-fallback' };
            }
          }
          if (!visualHit) return;
          var sort = typeof spriteRenderer.computeSpriteRenderableSort === 'function'
            ? spriteRenderer.computeSpriteRenderableSort(candidate, candidatePrefab)
            : { sortKey: 0, tie: 0 };
          var rank = Number(sort && sort.sortKey || 0) * 1000000 + Number(sort && sort.tie || 0);
          if (!bestVisual || rank >= bestVisual.rank) bestVisual = { instance: candidate, rank: rank };
        });
      }
      if (bestVisual && bestVisual.instance) return bestVisual.instance;
    }

    // Pixi is only a visual-owner fallback here; Behavior does not invent a
    // separate world-space hit box.
    var hasCanonicalAlphaHit = !!(spriteRenderer && typeof spriteRenderer.hitTestPrefabSpriteAtScreen === 'function');
    var pixiConsumer = appPath('renderer.optimization.pixiDynamicRenderableConsumer') || global.__SHARED_RENDER_OPTIMIZATION_PIXI_DYNAMIC_RENDERABLE_CONSUMER__ || null;
    if (!hasCanonicalAlphaHit && pixiConsumer && typeof pixiConsumer.pickPrefabSpriteAtScreen === 'function') {
      var visualHit = pixiConsumer.pickPrefabSpriteAtScreen(sx, sy);
      if (visualHit && visualHit.instanceId) {
        var visualInstance = findInstanceByRuntimeId(visualHit.instanceId);
        if (visualInstance) return visualInstance;
      }
    }

    if (typeof global.pickBoxAtScreen !== 'function') return null;
    var picked = global.pickBoxAtScreen(sx, sy);
    if (!picked) return null;
    var pApi = placement();
    var pickedInstance = pApi && typeof pApi.findInstanceForBox === 'function'
      ? pApi.findInstanceForBox(picked)
      : (typeof global.findInstanceForBox === 'function' ? global.findInstanceForBox(picked) : null);
    if (!pickedInstance) return null;
    // A sprite_proxy is interacted with through its visible pixels, not its
    // invisible collision voxel. Falling back to the box for such an object
    // recreates the exact "click works somewhere beside the image" bug.
    var pickedPrefab = getInstancePrefab(pickedInstance);
    if (spriteRenderer && pickedPrefab && typeof spriteRenderer.prefabHasSprite === 'function' && spriteRenderer.prefabHasSprite(pickedPrefab)) return null;
    return pickedInstance;
  }

  function currentEditorMode() {
    var runtime = appPath('state.runtimeState');
    if (runtime && runtime.editor && runtime.editor.mode) return String(runtime.editor.mode);
    try { return String((global.editor && global.editor.mode) || 'view'); } catch (_) { return 'view'; }
  }

  function onCanvasMouseDownCapture(e) {
    if (e.button !== 0 || currentEditorMode() !== 'view') return;
    var instance = pickInstanceFromMouseEvent(e);
    if (!instance) return; // ground click still uses the real player's pathfinding
    var funcs = parseFunctions(behaviorScript(instance));
    var handler = funcs.onClick ? 'onClick' : (funcs.onInteract ? 'onInteract' : '');
    if (!handler) return; // ordinary objects keep the main program's existing click/select behavior
    e.preventDefault();
    e.stopImmediatePropagation();
    executeFunction(instance, handler, 0);
  }

  function installCanvasBehaviorHook() {
    var canvas = document.getElementById('game');
    if (!canvas) return false;
    canvas.addEventListener('mousedown', onCanvasMouseDownCapture, true);
    return true;
  }


  function initializeIsolatedScene() {
    try {
      var graph = appPath('state.sceneGraph') || global.__SCENE_GRAPH_STATE__ || null;
      if (graph && typeof graph.replaceSceneGraph === 'function') graph.replaceSceneGraph({ instances: [], boxes: [] }, { source: 'behavior-main-test:isolate' });
      if (typeof global.resetPlayer === 'function') global.resetPlayer();
      var view = document.getElementById('modeView');
      if (view) view.click();
      log('测试场景已隔离：保留主世界/地面设置，清空场景物品并使用主程序人物。', 'info');
    } catch (err) { log('隔离测试场景失败：' + String(err && err.message || err), 'warn'); }
  }

  function flushPendingImports() {
    var list = pendingImports.splice(0);
    list.forEach(function (msg) { handleImport(msg); });
  }
  function handleImport(data) {
    try {
      var compiled = compilePrefab(data.prefab);
      registerVisiblePrefab(compiled, data.select !== false);
    } catch (err) { log('Prefab 注入失败：' + String(err && err.message || err), 'error'); }
  }
  function onMessage(event) {
    if (event.origin !== global.location.origin) return;
    var data = event.data || {};
    if (!data || data.source !== 'hzh-behavior-editor') return;
    if (data.type === 'HZH_TEST_IMPORT_PREFAB') {
      if (!mainReady) pendingImports.push(data); else handleImport(data);
      return;
    }
  }

  function markEmbeddedUi() {
    document.documentElement.classList.add('hzh-behavior-test-embedded');
    document.body.classList.add('hzh-behavior-test-embedded');
    var banner = document.createElement('div');
    banner.id = 'hzhBehaviorEmbeddedBanner';
    banner.textContent = 'Behavior TestWorld · 此处就是 start.bat 主程序运行环境';
    document.body.appendChild(banner);
  }

  function waitForMain() {
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      var reg = registry();
      var canvas = document.getElementById('game');
      if (reg && canvas && installCanvasBehaviorHook()) {
        clearInterval(timer);
        mainReady = true;
        if (embeddedTest) {
          initializeIsolatedScene();
          markEmbeddedUi();
          flushPendingImports();
          post('HZH_TEST_MAIN_READY', { version: VERSION });
        }
        try {
          global.__HZH_BEHAVIOR_RUNTIME__ = {
            version: VERSION,
            alwaysOn: true,
            switchInstanceState: switchInstanceState,
            executeFunction: executeFunction,
            stateIdForInstance: stateIdForInstance
          };
        } catch (_) {}
      } else if (tries > 240) {
        clearInterval(timer);
        log('主程序 TestWorld 初始化超时。', 'error');
      }
    }, 50);
  }

  global.addEventListener('message', onMessage);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForMain, { once: true }); else waitForMain();
})(typeof window !== 'undefined' ? window : globalThis);
