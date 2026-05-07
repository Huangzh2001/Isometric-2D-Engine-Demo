// P12a-4: Player sprite frame renderer owner.
(function (global) {
  'use strict';

  var PLAYER_VISUAL_BASE_HEIGHT = 1.7;

  function getPlayerVisualScale() {
    return Math.max(0.2, (settings.playerHeightCells / PLAYER_VISUAL_BASE_HEIGHT) * settings.tileScale);
  }

  function currentAnimFrame() {
    if (!player.moving) return 0;
    return Math.floor(player.walk) % SPRITE.frames;
  }

  function getPlayerUnifiedLightCenter() {
    var baseZ = Number(player && player.visualZ != null ? player.visualZ : player && player.z || 0);
    return {
      x: player.x,
      y: player.y,
      z: baseZ + Math.max(0.55, settings.playerHeightCells * 0.52),
    };
  }

  function preparePlayerSpriteFrame() {
    if (!assetsReady) return null;

    var frame = currentAnimFrame();
    var row = SPRITE.rows[player.dir] ?? 0;
    var frameX = frame * SPRITE.frameW;
    var rowY = row * SPRITE.frameH;
    var foot = iso(player.x, player.y, Number(player && player.visualZ != null ? player.visualZ : player && player.z || 0));
    var spriteScale = getPlayerVisualScale();
    var scaledFrameW = Math.max(1, Math.round(SPRITE.frameW * spriteScale));
    var scaledFrameH = Math.max(1, Math.round(SPRITE.frameH * spriteScale));
    var xLeft = Math.round(foot.x - scaledFrameW / 2);
    var yTop = Math.round(foot.y - SPRITE.bottom * spriteScale);
    var visibleHeight = SPRITE.bottom - SPRITE.top;
    var totalH = Math.max(0.2, settings.playerHeightCells);

    var spriteLight = spriteLightAt(getPlayerUnifiedLightCenter());
    var brightness = spriteLight.brightness;
    var tint = spriteLight.tint;
    var weight = spriteLight.weight;
    var tintAlpha = clamp(weight * 0.18, 0, 0.35);

    var cacheKey = [
      frame,
      row,
      brightness.toFixed(3),
      tint.r.toFixed(1),
      tint.g.toFixed(1),
      tint.b.toFixed(1),
      tintAlpha.toFixed(3),
    ].join('|');

    var cacheHit = playerSpriteFrameCache.key === cacheKey;
    notePlayerSpriteCache(cacheHit, `frame=${frame} row=${row} brightness=${brightness.toFixed(3)} tintAlpha=${tintAlpha.toFixed(3)} moving=${player.moving}`);

    if (!cacheHit) {
      playerSpriteFrameBuffer.width = SPRITE.frameW;
      playerSpriteFrameBuffer.height = SPRITE.frameH;
      playerSpriteFrameCtx.clearRect(0, 0, SPRITE.frameW, SPRITE.frameH);

      playerSpriteFrameCtx.save();
      playerSpriteFrameCtx.filter = `brightness(${Math.round(brightness * 100)}%)`;
      playerSpriteFrameCtx.drawImage(spriteSheet, frameX, rowY, SPRITE.frameW, SPRITE.frameH, 0, 0, SPRITE.frameW, SPRITE.frameH);
      playerSpriteFrameCtx.restore();

      playerSpriteFrameCtx.save();
      playerSpriteFrameCtx.globalCompositeOperation = 'source-atop';
      playerSpriteFrameCtx.fillStyle = rgbToCss(tint, tintAlpha);
      playerSpriteFrameCtx.fillRect(0, 0, SPRITE.frameW, SPRITE.frameH);
      playerSpriteFrameCtx.restore();

      playerSpriteFrameCache.key = cacheKey;
      playerSpriteFrameCache.frame = frame;
      playerSpriteFrameCache.row = row;
      playerSpriteFrameCache.xLeft = xLeft;
      playerSpriteFrameCache.scaledFrameW = scaledFrameW;
      playerSpriteFrameCache.scaledFrameH = scaledFrameH;
      playerSpriteFrameCache.spriteScale = spriteScale;
      playerSpriteFrameCache.yTop = yTop;
      playerSpriteFrameCache.visibleHeight = visibleHeight;
      playerSpriteFrameCache.totalH = totalH;
      playerSpriteFrameCache.brightness = brightness;
      playerSpriteFrameCache.tint = tint;
      playerSpriteFrameCache.weight = weight;
    }

    playerSpriteFrameCache.xLeft = xLeft;
    playerSpriteFrameCache.yTop = yTop;
    playerSpriteFrameCache.scaledFrameW = scaledFrameW;
    playerSpriteFrameCache.scaledFrameH = scaledFrameH;
    playerSpriteFrameCache.spriteScale = spriteScale;
    playerSpriteFrameCache.visibleHeight = visibleHeight;
    playerSpriteFrameCache.totalH = totalH;

    return playerSpriteFrameCache;
  }

  function drawPlayerAvatar() {
    var prepared = preparePlayerSpriteFrame();
    var spriteScale = prepared ? prepared.spriteScale : getPlayerVisualScale();
    if (assetsReady && prepared) {
      ctx.drawImage(playerSpriteFrameBuffer, 0, 0, SPRITE.frameW, SPRITE.frameH, prepared.xLeft, prepared.yTop, prepared.scaledFrameW, prepared.scaledFrameH);
    } else {
      var foot = iso(player.x, player.y, Number(player && player.visualZ != null ? player.visualZ : player && player.z || 0));
      var xLeft = Math.round(foot.x - (SPRITE.frameW * spriteScale) / 2);
      var yTop = Math.round(foot.y - SPRITE.bottom * spriteScale);
      var boxW = Math.max(2, Math.round(16 * spriteScale));
      var boxH = Math.max(8, Math.round((SPRITE.bottom - SPRITE.top) * spriteScale));
      var center = getPlayerUnifiedLightCenter();
      var c = rgbToCss(litColor({ r: 106, g: 177, b: 255 }, center, { x: 0, y: 0, z: 1 }));
      ctx.fillStyle = c;
      ctx.fillRect(xLeft + Math.round(28 * spriteScale), yTop + Math.round(SPRITE.top * spriteScale), boxW, boxH);
    }

    if (showDebug) {
      var proxy = playerPlacementAABB();
      var pts = cubePoints(proxy.x, proxy.y, proxy.z || 0, proxy.w, proxy.d, proxy.h);
      drawPoly([pts.p000, pts.p100, pts.p110, pts.p010], 'rgba(124,242,154,.05)', 'rgba(124,242,154,.85)');
    }
  }

  var api = {
    getPlayerVisualScale: getPlayerVisualScale,
    currentAnimFrame: currentAnimFrame,
    getPlayerUnifiedLightCenter: getPlayerUnifiedLightCenter,
    preparePlayerSpriteFrame: preparePlayerSpriteFrame,
    drawPlayerAvatar: drawPlayerAvatar,
  };
  global.__APP_PRESENTATION_PLAYER_SPRITE_FRAME__ = api;
  global.__PLAYER_SPRITE_FRAME__ = api;
  global.IsometricPlayerSpriteFrame = api;
})(typeof window !== 'undefined' ? window : globalThis);
