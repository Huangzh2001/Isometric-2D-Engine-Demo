// P8b: Canvas 2D shadow overlay draw pass helpers.
// Layer: presentation/render/renderer.
//
// Owns Canvas2D clipping/compositing for face shadow overlays. Dependencies
// that still belong to render.js or lighting/debug systems are injected by the
// caller; this file must not own scene state, renderable assembly, ordering, or
// domain geometry rules.
(function registerCanvas2dShadowOverlays(global) {
  function asNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function defaultClamp(value, min, max) {
    var n = asNumber(value, 0);
    var lo = asNumber(min, 0);
    var hi = asNumber(max, 1);
    return Math.max(lo, Math.min(hi, n));
  }

  function getClamp(deps) {
    return deps && typeof deps.clamp === 'function' ? deps.clamp : defaultClamp;
  }

  function getUnionCtx(deps) {
    if (!deps || typeof deps.ensureShadowPolyUnionCanvas !== 'function') return null;
    return deps.ensureShadowPolyUnionCanvas();
  }

  function getViewW(deps, unionCtx) {
    if (deps && Number.isFinite(Number(deps.viewW))) return Number(deps.viewW);
    return unionCtx && unionCtx.canvas ? Number(unionCtx.canvas.width || 0) : 0;
  }

  function getViewH(deps, unionCtx) {
    if (deps && Number.isFinite(Number(deps.viewH))) return Number(deps.viewH);
    return unionCtx && unionCtx.canvas ? Number(unionCtx.canvas.height || 0) : 0;
  }

  function linePointsToString(points) {
    return '[' + (Array.isArray(points) ? points : []).map(function (p) {
      return '(' + Number(p && p.x || 0).toFixed(1) + ',' + Number(p && p.y || 0).toFixed(1) + ')';
    }).join(' ') + ']';
  }

  function worldPolysToString(polys) {
    return (Array.isArray(polys) ? polys : []).map(function (poly) {
      return '[' + (Array.isArray(poly) ? poly : []).map(function (p) {
        return '(' + Number(p && p.x || 0).toFixed(2) + ',' + Number(p && p.y || 0).toFixed(2) + ',' + Number(p && p.z || 0).toFixed(2) + ')';
      }).join(' ') + ']';
    }).join(' | ');
  }

  function screenPolysToString(polys) {
    return (Array.isArray(polys) ? polys : []).map(function (poly) {
      return '[' + (Array.isArray(poly) ? poly : []).map(function (p) {
        return '(' + Number(p && p.x || 0).toFixed(1) + ',' + Number(p && p.y || 0).toFixed(1) + ')';
      }).join(' ') + ']';
    }).join(' | ');
  }

  function clipTargetToPoints(targetCtx, points) {
    if (!targetCtx || !Array.isArray(points) || points.length < 3) return false;
    targetCtx.beginPath();
    targetCtx.moveTo(Number(points[0].x || 0), Number(points[0].y || 0));
    for (var i = 1; i < points.length; i++) targetCtx.lineTo(Number(points[i].x || 0), Number(points[i].y || 0));
    targetCtx.closePath();
    targetCtx.clip();
    return true;
  }

  function drawHighContrastOutlines(targetCtx, screenPolys, overlay, fadeDebug, deps, clamp) {
    var lightState = deps && deps.lightState ? deps.lightState : null;
    if (!lightState || !lightState.highContrastShadow) return;
    var strokeCss = deps && typeof deps.shadowStrokeCss === 'function' ? deps.shadowStrokeCss : null;
    targetCtx.strokeStyle = strokeCss
      ? strokeCss(clamp((overlay.baseAlpha != null ? overlay.baseAlpha : overlay.alpha) * Number((fadeDebug && fadeDebug.factorFar) || 1), 0, 0.95))
      : 'rgba(0,0,0,0.35)';
    targetCtx.lineWidth = 0.7;
    for (var pi = 0; pi < screenPolys.length; pi++) {
      var poly = screenPolys[pi];
      if (!poly || poly.length < 3) continue;
      targetCtx.beginPath();
      targetCtx.moveTo(Number(poly[0].x || 0), Number(poly[0].y || 0));
      for (var i = 1; i < poly.length; i++) targetCtx.lineTo(Number(poly[i].x || 0), Number(poly[i].y || 0));
      targetCtx.closePath();
      targetCtx.stroke();
    }
  }

  function drawFaceShadowOverlays(targetCtx, receiverPoints, overlays, deps) {
    if (!targetCtx || !overlays || !overlays.length) return;
    var unionCtx = getUnionCtx(deps);
    if (!unionCtx) return;
    var clamp = getClamp(deps);
    var viewW = getViewW(deps, unionCtx);
    var viewH = getViewH(deps, unionCtx);
    var fillShadowUnionWithDistanceFade = deps && typeof deps.fillShadowUnionWithDistanceFade === 'function'
      ? deps.fillShadowUnionWithDistanceFade
      : null;
    var drawUnionShadowCanvasToTarget = deps && typeof deps.drawUnionShadowCanvasToTarget === 'function'
      ? deps.drawUnionShadowCanvasToTarget
      : null;
    if (!fillShadowUnionWithDistanceFade || !drawUnionShadowCanvasToTarget) return;

    for (var oi = 0; oi < overlays.length; oi++) {
      var overlay = overlays[oi];
      var clipPoints = (overlay && overlay.clipPoly && overlay.clipPoly.length >= 3) ? overlay.clipPoly : receiverPoints;
      if (!Array.isArray(clipPoints) || clipPoints.length < 3) continue;
      unionCtx.clearRect(0, 0, viewW, viewH);
      unionCtx.globalCompositeOperation = 'source-over';
      var screenPolys = [];
      var worldPolys = [];
      for (var pi = 0; pi < ((overlay && overlay.polys) || []).length; pi++) {
        var poly = overlay.polys[pi];
        if (!poly || poly.length < 3) continue;
        screenPolys.push(poly);
        worldPolys.push(((overlay && overlay.worldPolys) || [])[pi] || []);
      }
      if (!screenPolys.length) continue;

      var fadeDebug = {};
      fillShadowUnionWithDistanceFade(
        unionCtx,
        screenPolys,
        worldPolys,
        overlay.casterCenter || null,
        { type: overlay.lightType || 'unknown' },
        clamp(overlay.baseAlpha != null ? overlay.baseAlpha : overlay.alpha, 0, 0.95),
        fadeDebug
      );

      if (deps && typeof deps.shadowDebugLog === 'function' && deps.shadowDebugDetailed) {
        deps.shadowDebugLog('recv-screen alpha=' + String(clamp(overlay.alpha, 0, 0.95).toFixed(3))
          + ' near=' + String(clamp((overlay.baseAlpha != null ? overlay.baseAlpha : overlay.alpha) * Number((fadeDebug && fadeDebug.factorNear) || 1), 0, 0.95).toFixed(3))
          + ' far=' + String(clamp((overlay.baseAlpha != null ? overlay.baseAlpha : overlay.alpha) * Number((fadeDebug && fadeDebug.factorFar) || 1), 0, 0.95).toFixed(3))
          + ' recvScreen=' + linePointsToString(clipPoints)
          + ' world=' + worldPolysToString(overlay.worldPolys || [])
          + ' screen=' + screenPolysToString(overlay.polys || []));
      }
      if (deps && typeof deps.logScreenOverlayDebug === 'function') {
        deps.logScreenOverlayDebug({
          alpha: clamp(overlay.alpha, 0, 0.95),
          baseAlpha: clamp(overlay.baseAlpha != null ? overlay.baseAlpha : overlay.alpha, 0, 0.95),
          fadeReason: (fadeDebug && fadeDebug.reason) || 'none',
          fadeMode: (fadeDebug && fadeDebug.mode) || 'solid',
          fadeDistanceNear: Number((fadeDebug && fadeDebug.distanceNear) || 0),
          fadeDistanceFar: Number((fadeDebug && fadeDebug.distanceFar) || 0),
          sourceComp: overlay.sourceComp || null,
          receiverKind: overlay.receiverKind || '',
          owner: overlay.owner || null,
          patchId: overlay.patchId != null ? overlay.patchId : null,
          receiverScreen: clipPoints,
          worldPolys: overlay.worldPolys || [],
          screenPolys: overlay.polys || [],
          clipWorldPts: overlay.clipWorldPts || null,
          mergedPlaneKey: overlay.mergedPlaneKey || '',
          receiverCenter: overlay.receiverCenter || null,
          casterCenter: overlay.casterCenter || null,
          gradientStart: (fadeDebug && fadeDebug.gradientStart) || null,
          gradientEnd: (fadeDebug && fadeDebug.gradientEnd) || null,
          polyCount: screenPolys.length,
          probeMatch: (deps && typeof deps.shadowProbeMatchReceiver === 'function')
            ? deps.shadowProbeMatchReceiver(overlay.receiverKind || '', overlay.owner || null, overlay.clipWorldPts || null, overlay.mergedPlaneKey || '', overlay.patchId != null ? overlay.patchId : null)
            : null
        });
      }

      targetCtx.save();
      clipTargetToPoints(targetCtx, clipPoints);
      drawUnionShadowCanvasToTarget(targetCtx, overlay.alpha);
      drawHighContrastOutlines(targetCtx, screenPolys, overlay, fadeDebug, deps || {}, clamp);
      targetCtx.restore();
    }
  }

  function addOffsetToPoints(points, dx, dy) {
    return (Array.isArray(points) ? points : []).map(function (pt) {
      return { x: Number(pt && pt.x || 0) + dx, y: Number(pt && pt.y || 0) + dy };
    });
  }

  function drawFaceShadowOverlaysNoCamera(targetCtx, receiverPointsNoCamera, overlaysNoCamera, offsetX, offsetY, deps) {
    if (!targetCtx || !overlaysNoCamera || !overlaysNoCamera.length) return;
    var dx = Number(offsetX || 0);
    var dy = Number(offsetY || 0);
    var unionCtx = getUnionCtx(deps);
    if (!unionCtx) return;
    var clamp = getClamp(deps);
    var viewW = getViewW(deps, unionCtx);
    var viewH = getViewH(deps, unionCtx);
    var fillShadowUnionWithDistanceFade = deps && typeof deps.fillShadowUnionWithDistanceFade === 'function'
      ? deps.fillShadowUnionWithDistanceFade
      : null;
    var drawUnionShadowCanvasToTarget = deps && typeof deps.drawUnionShadowCanvasToTarget === 'function'
      ? deps.drawUnionShadowCanvasToTarget
      : null;
    if (!fillShadowUnionWithDistanceFade || !drawUnionShadowCanvasToTarget) return;

    for (var oi = 0; oi < overlaysNoCamera.length; oi++) {
      var overlay = overlaysNoCamera[oi];
      var clipPoints = (overlay && overlay.clipPolyNoCamera && overlay.clipPolyNoCamera.length >= 3)
        ? addOffsetToPoints(overlay.clipPolyNoCamera, dx, dy)
        : addOffsetToPoints(receiverPointsNoCamera, dx, dy);
      if (!clipPoints.length) continue;
      unionCtx.clearRect(0, 0, viewW, viewH);
      unionCtx.globalCompositeOperation = 'source-over';
      var screenPolys = [];
      var worldPolys = [];
      for (var pi = 0; pi < ((overlay && overlay.polysNoCamera) || []).length; pi++) {
        var polyNoCamera = overlay.polysNoCamera[pi];
        if (!polyNoCamera || polyNoCamera.length < 3) continue;
        screenPolys.push(addOffsetToPoints(polyNoCamera, dx, dy));
        worldPolys.push(((overlay && overlay.worldPolys) || [])[pi] || []);
      }
      if (!screenPolys.length) continue;
      var fadeDebug = {};
      fillShadowUnionWithDistanceFade(
        unionCtx,
        screenPolys,
        worldPolys,
        overlay.casterCenter || null,
        { type: overlay.lightType || 'unknown' },
        clamp(overlay.baseAlpha != null ? overlay.baseAlpha : overlay.alpha, 0, 0.95),
        fadeDebug
      );
      targetCtx.save();
      clipTargetToPoints(targetCtx, clipPoints);
      drawUnionShadowCanvasToTarget(targetCtx, overlay.alpha);
      targetCtx.restore();
    }
  }

  var api = {
    layer: 'presentation/render/renderer',
    phase: 'P8b',
    drawFaceShadowOverlays: drawFaceShadowOverlays,
    drawFaceShadowOverlaysNoCamera: drawFaceShadowOverlaysNoCamera
  };

  global.IsometricCanvas2dShadowOverlays = api;
  global.__CANVAS2D_SHADOW_OVERLAYS__ = api;
  global.__APP_PRESENTATION_CANVAS2D_SHADOW_OVERLAYS__ = api;
})(typeof window !== 'undefined' ? window : globalThis);
