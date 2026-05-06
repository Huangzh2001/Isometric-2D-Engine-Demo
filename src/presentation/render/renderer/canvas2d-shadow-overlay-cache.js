// P11a-4: Canvas2D shadow overlay projection/cache helpers.
// Layer: presentation/render/renderer.
//
// Owns render-facing shadow overlay projection, screen-offset cloning, and
// per-face world-overlay cache. Dependencies still owned by render.js, lighting,
// and debug systems are injected by the caller. This module must not read scene
// runtime globals directly and must not own Canvas drawing/compositing.
(function registerCanvas2dShadowOverlayCache(global) {
  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function asNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function getIso(deps) {
    if (deps && typeof deps.iso === 'function') return deps.iso;
    throw new Error('canvas2d-shadow-overlay-cache requires injected iso dependency');
  }

  function getNoCameraProjector(deps) {
    if (deps && typeof deps.screenPointsFromWorldFaceNoCamera === 'function') return deps.screenPointsFromWorldFaceNoCamera;
    throw new Error('canvas2d-shadow-overlay-cache requires injected screenPointsFromWorldFaceNoCamera dependency');
  }

  function getPerfNow(deps) {
    if (deps && typeof deps.perfNow === 'function') return deps.perfNow;
    if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') return function () { return performance.now(); };
    return function () { return Date.now(); };
  }

  function cloneWorldPoint(p) {
    return { x: asNumber(p && p.x, 0), y: asNumber(p && p.y, 0), z: asNumber(p && p.z, 0) };
  }

  function worldShadowOverlaysToScreen(overlays, deps) {
    var iso = getIso(deps);
    return asArray(overlays).map(function (overlay) {
      overlay = overlay || {};
      var clipWorldPts = overlay.clipWorldPts || null;
      var worldPolys = asArray(overlay.worldPolys);
      return {
        alpha: overlay.alpha,
        baseAlpha: overlay.baseAlpha != null ? overlay.baseAlpha : overlay.alpha,
        worldPolys: worldPolys,
        clipWorldPts: clipWorldPts,
        clipPoly: clipWorldPts ? asArray(clipWorldPts).map(function (p) { return iso(p.x, p.y, p.z); }) : null,
        receiverKind: overlay.receiverKind || '',
        owner: overlay.owner || null,
        patchId: overlay.patchId != null ? overlay.patchId : null,
        mergedPlaneKey: overlay.mergedPlaneKey || '',
        receiverCenter: overlay.receiverCenter || null,
        sourceComp: overlay.sourceComp || null,
        casterCenter: overlay.casterCenter || null,
        lightType: overlay.lightType || 'unknown',
        polys: worldPolys.map(function (poly) {
          return asArray(poly).map(function (p) { return iso(p.x, p.y, p.z); });
        })
      };
    });
  }

  function worldShadowOverlaysToNoCamera(overlays, viewRotation, deps) {
    var project = getNoCameraProjector(deps);
    return asArray(overlays).map(function (overlay) {
      overlay = overlay || {};
      var clipWorldPts = overlay.clipWorldPts || null;
      var worldPolys = asArray(overlay.worldPolys);
      return {
        alpha: overlay.alpha,
        baseAlpha: overlay.baseAlpha != null ? overlay.baseAlpha : overlay.alpha,
        worldPolys: worldPolys,
        clipWorldPts: clipWorldPts,
        clipPolyNoCamera: clipWorldPts ? project(clipWorldPts, viewRotation) : null,
        receiverKind: overlay.receiverKind || '',
        owner: overlay.owner || null,
        patchId: overlay.patchId != null ? overlay.patchId : null,
        mergedPlaneKey: overlay.mergedPlaneKey || '',
        receiverCenter: overlay.receiverCenter || null,
        sourceComp: overlay.sourceComp || null,
        casterCenter: overlay.casterCenter || null,
        lightType: overlay.lightType || 'unknown',
        polysNoCamera: worldPolys.map(function (poly) {
          return project(poly, viewRotation);
        })
      };
    });
  }

  function shiftShadowOverlays(overlays, sx, sy) {
    var dx = asNumber(sx, 0);
    var dy = asNumber(sy, 0);
    return asArray(overlays).map(function (overlay) {
      overlay = overlay || {};
      return {
        alpha: overlay.alpha,
        baseAlpha: overlay.baseAlpha != null ? overlay.baseAlpha : overlay.alpha,
        worldPolys: overlay.worldPolys || [],
        clipWorldPts: overlay.clipWorldPts || null,
        clipPoly: asArray(overlay.clipPoly).map(function (pt) { return { x: asNumber(pt && pt.x, 0) + dx, y: asNumber(pt && pt.y, 0) + dy }; }),
        receiverKind: overlay.receiverKind || '',
        owner: overlay.owner || null,
        patchId: overlay.patchId != null ? overlay.patchId : null,
        mergedPlaneKey: overlay.mergedPlaneKey || '',
        receiverCenter: overlay.receiverCenter || null,
        sourceComp: overlay.sourceComp || null,
        casterCenter: overlay.casterCenter || null,
        lightType: overlay.lightType || 'unknown',
        polys: asArray(overlay.polys).map(function (poly) {
          return asArray(poly).map(function (pt) { return { x: asNumber(pt && pt.x, 0) + dx, y: asNumber(pt && pt.y, 0) + dy }; });
        })
      };
    });
  }

  var voxelFaceShadowOverlayCache = { sig: '', map: new Map() };

  function currentShadowOverlaySignature(deps) {
    deps = deps || {};
    var parts = [];
    var boxes = asArray(deps.boxes);
    var lightState = deps.lightState || null;
    var lights = asArray(deps.lights);
    parts.push(typeof deps.boxesShadowSignature === 'function' ? deps.boxesShadowSignature() : String(boxes.length));
    parts.push(String(!!(lightState && lightState.showShadows)));
    parts.push(String(!!(typeof deps.isLightingSystemEnabled === 'function' ? deps.isLightingSystemEnabled() : true)));
    var renderLights = [];
    if (typeof deps.getShadowDebugRenderLights === 'function') renderLights = deps.getShadowDebugRenderLights() || [];
    else if (typeof deps.getLightingRenderLights === 'function') renderLights = deps.getLightingRenderLights() || [];
    else renderLights = lights;
    renderLights = asArray(renderLights);
    for (var i = 0; i < renderLights.length; i++) {
      var l = renderLights[i] || {};
      parts.push([
        l.id || l.name || i,
        l.type || 'light',
        asNumber(l.x, 0).toFixed(3), asNumber(l.y, 0).toFixed(3), asNumber(l.z, 0).toFixed(3),
        asNumber(l.angle, 0).toFixed(3), asNumber(l.pitch, 0).toFixed(3),
        asNumber(l.intensity, 0).toFixed(3), asNumber(l.size, 0).toFixed(3), asNumber(l.softness, 0).toFixed(3)
      ].join(','));
    }
    parts.push([
      !!(lightState && lightState.shadowDistanceFadeEnabled),
      asNumber(lightState && lightState.shadowDistanceFadeRate, 0).toFixed(3),
      asNumber(lightState && lightState.shadowDistanceFadeMin, 0).toFixed(3),
      !!(lightState && lightState.shadowEdgeFadeEnabled),
      asNumber(lightState && lightState.shadowEdgeFadePx, 0).toFixed(3)
    ].join(','));
    return parts.join('|');
  }

  function voxelFaceShadowCacheKey(facePts, normal, ownerInstanceId) {
    var faceKey = asArray(facePts).map(function (p) {
      return [asNumber(p && p.x, 0).toFixed(3), asNumber(p && p.y, 0).toFixed(3), asNumber(p && p.z, 0).toFixed(3)].join(',');
    }).join(';');
    var normalKey = [asNumber(normal && normal.x, 0).toFixed(3), asNumber(normal && normal.y, 0).toFixed(3), asNumber(normal && normal.z, 0).toFixed(3)].join(',');
    return String(ownerInstanceId || 'none') + '|' + normalKey + '|' + faceKey;
  }

  function cloneWorldShadowOverlays(overlays) {
    return asArray(overlays).map(function (overlay) {
      overlay = overlay || {};
      return {
        alpha: overlay.alpha,
        baseAlpha: overlay.baseAlpha != null ? overlay.baseAlpha : overlay.alpha,
        worldPolys: asArray(overlay.worldPolys).map(function (poly) {
          return asArray(poly).map(cloneWorldPoint);
        }),
        clipWorldPts: Array.isArray(overlay.clipWorldPts)
          ? overlay.clipWorldPts.map(cloneWorldPoint)
          : null,
        receiverKind: overlay.receiverKind || '',
        owner: overlay.owner || null,
        patchId: overlay.patchId != null ? overlay.patchId : null,
        mergedPlaneKey: overlay.mergedPlaneKey || '',
        receiverCenter: overlay.receiverCenter || null,
        sourceComp: overlay.sourceComp || null,
        casterCenter: overlay.casterCenter || null,
        lightType: overlay.lightType || 'unknown'
      };
    });
  }

  function addProfile(profileStats, key, value) {
    if (!profileStats) return;
    profileStats[key] = Number(profileStats[key] || 0) + value;
  }

  function getVoxelFaceShadowWorldOverlays(facePts, normal, ownerInstanceId, profileStats, deps) {
    deps = deps || {};
    var perfNow = getPerfNow(deps);
    var totalStartAt = perfNow();
    var sig = currentShadowOverlaySignature(deps);
    if (voxelFaceShadowOverlayCache.sig !== sig) {
      if (typeof deps.noteShadowOverlayCache === 'function') deps.noteShadowOverlayCache('invalidate-all', { oldSig: voxelFaceShadowOverlayCache.sig || '', newSig: sig, reason: 'signature-changed' });
      voxelFaceShadowOverlayCache.sig = sig;
      voxelFaceShadowOverlayCache.map = new Map();
    }
    var cacheLookupStartAt = perfNow();
    var key = voxelFaceShadowCacheKey(facePts, normal, ownerInstanceId);
    var worldOverlays;
    var cacheHit = voxelFaceShadowOverlayCache.map.has(key);
    if (cacheHit) {
      worldOverlays = voxelFaceShadowOverlayCache.map.get(key);
    } else {
      if (typeof deps.collectProjectedShadowPolysForReceiver !== 'function') {
        throw new Error('canvas2d-shadow-overlay-cache requires injected collectProjectedShadowPolysForReceiver dependency');
      }
      var collectStartAt = perfNow();
      worldOverlays = deps.collectProjectedShadowPolysForReceiver(facePts, normal, ownerInstanceId);
      if (profileStats) {
        addProfile(profileStats, 'step4f_shadowOverlayCollectMs', Math.max(0, perfNow() - collectStartAt));
        profileStats.touchedProjectedShadowCollector = true;
        addProfile(profileStats, 'shadowOverlayCacheMissCount', 1);
      }
      voxelFaceShadowOverlayCache.map.set(key, worldOverlays);
    }
    if (profileStats) {
      addProfile(profileStats, 'step4e_shadowOverlayCacheLookupMs', Math.max(0, perfNow() - cacheLookupStartAt));
      if (cacheHit) addProfile(profileStats, 'shadowOverlayCacheHitCount', 1);
      addProfile(profileStats, 'shadowOverlayTotalCount', Array.isArray(worldOverlays) ? worldOverlays.length : 0);
    }
    if (typeof deps.noteShadowOverlayCache === 'function') {
      deps.noteShadowOverlayCache(cacheHit ? 'hit' : 'miss', {
        owner: ownerInstanceId || null,
        keyHash: (typeof deps.dbgSimpleHash === 'function' ? deps.dbgSimpleHash(key) : key),
        cacheSize: voxelFaceShadowOverlayCache.map.size,
        overlayCount: Array.isArray(worldOverlays) ? worldOverlays.length : 0,
        facePts: facePts,
        normal: normal,
        cameraSig: (typeof deps.cameraSignatureForDebug === 'function' ? deps.cameraSignatureForDebug() : ''),
        shadowSig: sig
      });
    }
    var cloneStartAt = perfNow();
    var cloned = cloneWorldShadowOverlays(worldOverlays);
    if (profileStats) {
      addProfile(profileStats, 'step4g_shadowOverlayCloneMs', Math.max(0, perfNow() - cloneStartAt));
      addProfile(profileStats, 'step4d_shadowOverlayTotalMs', Math.max(0, perfNow() - totalStartAt));
      profileStats.touchedShadowOverlayPath = true;
    }
    return cloned;
  }

  function buildVoxelFaceShadowWorldOverlays(facePts, normal, ownerInstanceId, profileStats, deps) {
    return getVoxelFaceShadowWorldOverlays(facePts, normal, ownerInstanceId, profileStats, deps);
  }

  function buildVoxelFaceShadowOverlays(facePts, normal, ownerInstanceId, deps) {
    return worldShadowOverlaysToScreen(getVoxelFaceShadowWorldOverlays(facePts, normal, ownerInstanceId, null, deps), deps);
  }

  function resetShadowOverlayCacheForTests() {
    voxelFaceShadowOverlayCache.sig = '';
    voxelFaceShadowOverlayCache.map = new Map();
  }

  var api = {
    layer: 'presentation/render/renderer',
    phase: 'P11a-4',
    worldShadowOverlaysToScreen: worldShadowOverlaysToScreen,
    worldShadowOverlaysToNoCamera: worldShadowOverlaysToNoCamera,
    shiftShadowOverlays: shiftShadowOverlays,
    currentShadowOverlaySignature: currentShadowOverlaySignature,
    voxelFaceShadowCacheKey: voxelFaceShadowCacheKey,
    cloneWorldShadowOverlays: cloneWorldShadowOverlays,
    getVoxelFaceShadowWorldOverlays: getVoxelFaceShadowWorldOverlays,
    buildVoxelFaceShadowWorldOverlays: buildVoxelFaceShadowWorldOverlays,
    buildVoxelFaceShadowOverlays: buildVoxelFaceShadowOverlays,
    resetShadowOverlayCacheForTests: resetShadowOverlayCacheForTests
  };

  global.IsometricCanvas2dShadowOverlayCache = api;
  global.__CANVAS2D_SHADOW_OVERLAY_CACHE__ = api;
  global.__APP_PRESENTATION_CANVAS2D_SHADOW_OVERLAY_CACHE__ = api;
})(typeof window !== 'undefined' ? window : globalThis);
