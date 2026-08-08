(function (global) {
  'use strict';

  var core = global.__HZH_PIXEL_ART_CORE__;
  if (!core) throw new Error('pixel-art-core.js must load before pixel-art-workflow-controller.js');

  var VERSION = 'HZH-PIXEL-ART-WORKFLOW-V3-MATERIAL-STATES';

  function createController(options) {
    options = options || {};
    var doc = core.createDocument(options.width || 32, options.height || 32);
    var listeners = [];
    var undoStack = [];
    var redoStack = [];
    var transactionSnapshot = null;
    var transactionLabel = '';
    var maxHistory = Math.max(5, Math.min(80, Number(options.maxHistory) || 35));
    var tool = 'pencil';
    var primaryColor = [255, 255, 255, 255];
    var secondaryColor = [0, 0, 0, 255];

    function emit(type, detail) {
      var event = { type: String(type || 'change'), detail: detail || {}, document: doc, state: getState() };
      listeners.slice().forEach(function (listener) {
        try { listener(event); } catch (_) {}
      });
    }

    function getState() {
      var facing = core.getFacing(doc, doc.activeFacing);
      return {
        version: VERSION,
        activeFacing: doc.activeFacing,
        activeLayerId: facing ? facing.activeLayerId : '',
        tool: tool,
        primaryColor: primaryColor.slice(),
        secondaryColor: secondaryColor.slice(),
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        historyDepth: undoStack.length
      };
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') return function () {};
      listeners.push(listener);
      return function () {
        var index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    }

    function snapshot() {
      return core.serializeDocument(doc);
    }

    function restore(serialized, reason) {
      doc = core.deserializeDocument(serialized);
      emit('document-restored', { reason: String(reason || 'restore') });
      return doc;
    }

    function pushUndo(serialized, label) {
      undoStack.push({ label: String(label || '编辑'), document: serialized });
      if (undoStack.length > maxHistory) undoStack.shift();
      redoStack.length = 0;
    }

    function beginTransaction(label) {
      if (transactionSnapshot) return false;
      transactionSnapshot = snapshot();
      transactionLabel = String(label || '编辑');
      return true;
    }

    function commitTransaction(changed) {
      if (!transactionSnapshot) return false;
      var previous = transactionSnapshot;
      var label = transactionLabel;
      transactionSnapshot = null;
      transactionLabel = '';
      if (changed !== false) {
        pushUndo(previous, label);
        doc.metadata.updatedAt = new Date().toISOString();
        emit('change', { label: label });
        return true;
      }
      return false;
    }

    function cancelTransaction() {
      if (!transactionSnapshot) return false;
      var previous = transactionSnapshot;
      transactionSnapshot = null;
      transactionLabel = '';
      restore(previous, 'cancel-transaction');
      return true;
    }

    function mutate(label, fn) {
      var before = snapshot();
      var result = fn();
      if (result === false || result === 0) return result;
      pushUndo(before, label);
      doc.metadata.updatedAt = new Date().toISOString();
      emit('change', { label: label });
      return result;
    }

    function undo() {
      if (!undoStack.length) return false;
      var entry = undoStack.pop();
      redoStack.push({ label: entry.label, document: snapshot() });
      restore(entry.document, 'undo:' + entry.label);
      return true;
    }

    function redo() {
      if (!redoStack.length) return false;
      var entry = redoStack.pop();
      undoStack.push({ label: entry.label, document: snapshot() });
      restore(entry.document, 'redo:' + entry.label);
      return true;
    }

    function setDocument(nextDoc, reason) {
      var before = snapshot();
      doc = nextDoc && nextDoc.facings ? core.cloneDocument(nextDoc) : core.createDocument(32, 32);
      pushUndo(before, '载入素材');
      emit('document-replaced', { reason: String(reason || 'set-document') });
      return doc;
    }

    function setSerializedDocument(serialized, reason) {
      return setDocument(core.deserializeDocument(serialized), reason || 'deserialize');
    }

    function replaceDocument(nextDoc, reason) {
      doc = nextDoc && nextDoc.facings ? core.cloneDocument(nextDoc) : core.createDocument(32, 32);
      undoStack.length = 0;
      redoStack.length = 0;
      transactionSnapshot = null;
      transactionLabel = '';
      emit('document-replaced', { reason: String(reason || 'replace-document'), historyReset: true });
      return doc;
    }

    function replaceSerializedDocument(serialized, reason) {
      return replaceDocument(core.deserializeDocument(serialized), reason || 'replace-serialized');
    }

    function setActiveFacing(index) {
      var next = core.clampInt(index, 0, 3);
      if (doc.activeFacing === next) return false;
      doc.activeFacing = next;
      emit('selection', { kind: 'facing', value: next });
      return true;
    }

    function getActiveFacing() {
      return core.getFacing(doc, doc.activeFacing);
    }

    function getActiveLayer() {
      return core.getLayer(doc, doc.activeFacing);
    }

    function setActiveLayer(layerId) {
      var facing = getActiveFacing();
      if (!facing || !facing.layers.some(function (layer) { return layer.id === layerId; })) return false;
      facing.activeLayerId = String(layerId);
      emit('selection', { kind: 'layer', value: String(layerId) });
      return true;
    }

    function addLayer(name) {
      return mutate('新增图层', function () {
        var facing = getActiveFacing();
        var layer = core.createLayer(doc.width, doc.height, { name: String(name || ('图层 ' + (facing.layers.length + 1))) });
        facing.layers.push(layer);
        facing.activeLayerId = layer.id;
        return layer;
      });
    }

    function duplicateLayer() {
      return mutate('复制图层', function () {
        var facing = getActiveFacing();
        var layer = getActiveLayer();
        if (!facing || !layer) return false;
        var copy = core.createLayer(doc.width, doc.height, {
          name: layer.name + ' 副本',
          visible: layer.visible,
          opacity: layer.opacity,
          locked: layer.locked === true,
          blendMode: layer.blendMode || 'normal',
          source: layer.source,
          metadata: layer.metadata,
          offsetPx: core.getLayerOffset ? core.getLayerOffset(layer) : layer.offsetPx,
          surface: core.getLayerSurfaceSize ? Object.assign(core.getLayerOffset(layer), core.getLayerSurfaceSize(layer, doc.width, doc.height)) : null,
          pixels: layer.pixels
        });
        var index = facing.layers.indexOf(layer);
        facing.layers.splice(index + 1, 0, copy);
        facing.activeLayerId = copy.id;
        return copy;
      });
    }

    function removeLayer() {
      return mutate('删除图层', function () {
        var facing = getActiveFacing();
        var layer = getActiveLayer();
        if (!facing || !layer) return false;
        if (facing.layers.length === 1) {
          layer.pixels.fill(0);
          return true;
        }
        var index = facing.layers.indexOf(layer);
        facing.layers.splice(index, 1);
        facing.activeLayerId = facing.layers[Math.max(0, index - 1)].id;
        return true;
      });
    }

    function moveLayer(delta) {
      return mutate(delta > 0 ? '图层上移' : '图层下移', function () {
        var facing = getActiveFacing();
        var layer = getActiveLayer();
        if (!facing || !layer) return false;
        var index = facing.layers.indexOf(layer);
        var nextIndex = Math.max(0, Math.min(facing.layers.length - 1, index + (delta > 0 ? 1 : -1)));
        if (nextIndex === index) return false;
        facing.layers.splice(index, 1);
        facing.layers.splice(nextIndex, 0, layer);
        return true;
      });
    }

    function renameLayer(name) {
      var layer = getActiveLayer();
      if (!layer) return false;
      var next = String(name || '').trim() || '图层';
      if (layer.name === next) return false;
      return mutate('重命名图层', function () { layer.name = next; return true; });
    }

    function setLayerVisibility(layerId, visible) {
      var facing = getActiveFacing();
      if (!facing) return false;
      var layer = facing.layers.find(function (item) { return item.id === layerId; });
      if (!layer || layer.visible === !!visible) return false;
      return mutate('切换图层可见性', function () { layer.visible = !!visible; return true; });
    }

    function setLayerOpacity(layerId, opacity) {
      var facing = getActiveFacing();
      if (!facing) return false;
      var layer = facing.layers.find(function (item) { return item.id === layerId; });
      var next = Math.max(0, Math.min(1, Number(opacity) || 0));
      if (!layer || Math.abs(layer.opacity - next) < 0.0001) return false;
      return mutate('调整图层透明度', function () { layer.opacity = next; return true; });
    }

    function setLayerLocked(layerId, locked) {
      var facing = getActiveFacing();
      if (!facing) return false;
      var layer = facing.layers.find(function (item) { return item.id === layerId; });
      if (!layer || layer.locked === !!locked) return false;
      return mutate(locked ? '锁定图层' : '解锁图层', function () { layer.locked = !!locked; return true; });
    }

    function translateActiveLayer(dx, dy) {
      var layer = getActiveLayer();
      if (!layer || layer.locked) return false;
      return core.translateLayerPixels(layer, doc.width, doc.height, dx, dy);
    }

    function clearLayer() {
      return mutate('清空图层', function () {
        var layer = getActiveLayer();
        if (!layer || !layer.pixels.some(function (value) { return value !== 0; })) return false;
        layer.pixels.fill(0);
        return true;
      });
    }

    function resize(width, height) {
      width = core.clampInt(width, 1, 512);
      height = core.clampInt(height, 1, 512);
      if (width === doc.width && height === doc.height) return false;
      return mutate('调整画布分辨率', function () { core.resizeDocument(doc, width, height); return true; });
    }

    function importPixels(pixels, sourceWidth, sourceHeight, options) {
      options = options || {};
      var targetWidth = core.clampInt(options.width || doc.width, 1, 512);
      var targetHeight = core.clampInt(options.height || doc.height, 1, 512);
      var resized = core.nearestResizePixels(pixels, sourceWidth, sourceHeight, targetWidth, targetHeight);
      var quantized = core.quantizePixels(resized, core.clampInt(options.paletteLimit || 0, 0, 256));
      return mutate('导入并像素化图片', function () {
        if (doc.width !== targetWidth || doc.height !== targetHeight) core.resizeDocument(doc, targetWidth, targetHeight);
        var facing = getActiveFacing();
        var layer;
        if (options.newLayer !== false) {
          layer = core.createLayer(doc.width, doc.height, { name: String(options.layerName || '导入图片'), pixels: quantized.pixels });
          facing.layers.push(layer);
          facing.activeLayerId = layer.id;
        } else {
          layer = getActiveLayer();
          if (!layer) return false;
          layer.pixels = new Uint8ClampedArray(quantized.pixels);
          layer.offsetPx = { x: 0, y: 0 };
          layer.surfaceSize = { w: doc.width, h: doc.height };
        }
        doc.palette = quantized.palette.map(function (color) {
          return '#' + color.slice(0, 3).map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
        });
        doc.metadata.lastImport = {
          sourceWidth: sourceWidth,
          sourceHeight: sourceHeight,
          targetWidth: targetWidth,
          targetHeight: targetHeight,
          paletteLimit: Number(options.paletteLimit) || 0,
          importedAt: new Date().toISOString()
        };
        return layer;
      });
    }

    function copyFacingTo(targetIndex) {
      var sourceIndex = doc.activeFacing;
      var next = core.clampInt(targetIndex, 0, 3);
      if (next === sourceIndex) return false;
      return mutate('复制方向图片', function () { return core.copyFacing(doc, sourceIndex, next); });
    }

    function setTool(nextTool) {
      var allowed = ['pencil', 'eraser', 'fill', 'picker', 'line', 'rect', 'move'];
      var next = allowed.indexOf(nextTool) >= 0 ? nextTool : 'pencil';
      if (tool === next) return false;
      tool = next;
      emit('tool', { tool: tool });
      return true;
    }

    function setPrimaryColor(color) {
      primaryColor = [0, 1, 2, 3].map(function (index) { return Math.max(0, Math.min(255, Math.round(Number(color[index]) || 0))); });
      emit('color', { primaryColor: primaryColor.slice() });
    }

    function setSecondaryColor(color) {
      secondaryColor = [0, 1, 2, 3].map(function (index) { return Math.max(0, Math.min(255, Math.round(Number(color[index]) || 0))); });
      emit('color', { secondaryColor: secondaryColor.slice() });
    }

    function drawPoint(x, y, useSecondary) {
      var layer = getActiveLayer();
      if (!layer || layer.locked) return false;
      var color = tool === 'eraser' ? [0, 0, 0, 0] : (useSecondary ? secondaryColor : primaryColor);
      return core.setPixel(doc, layer, x, y, color);
    }

    function applyToolAt(x, y, options) {
      options = options || {};
      var layer = getActiveLayer();
      if (!layer || layer.locked) return false;
      var color = options.secondary ? secondaryColor : primaryColor;
      if (tool === 'eraser') color = [0, 0, 0, 0];
      if (tool === 'picker') {
        setPrimaryColor(core.getPixel(doc, layer, x, y));
        return false;
      }
      if (tool === 'fill') return mutate('填充颜色', function () { return core.floodFill(doc, layer, x, y, color); });
      return drawPoint(x, y, options.secondary);
    }

    function drawLine(x0, y0, x1, y1, secondary) {
      var layer = getActiveLayer();
      if (!layer || layer.locked) return false;
      var color = tool === 'eraser' ? [0, 0, 0, 0] : (secondary ? secondaryColor : primaryColor);
      return mutate('绘制直线', function () { return core.drawLine(doc, layer, x0, y0, x1, y1, color); });
    }

    function drawRect(x0, y0, x1, y1, secondary, filled) {
      var layer = getActiveLayer();
      if (!layer || layer.locked) return false;
      var color = tool === 'eraser' ? [0, 0, 0, 0] : (secondary ? secondaryColor : primaryColor);
      return mutate('绘制矩形', function () { return core.drawRect(doc, layer, x0, y0, x1, y1, color, !!filled); });
    }

    return {
      VERSION: VERSION,
      subscribe: subscribe,
      getDocument: function () { return doc; },
      getSerializedDocument: function () { return core.serializeDocument(doc); },
      setDocument: setDocument,
      setSerializedDocument: setSerializedDocument,
      replaceDocument: replaceDocument,
      replaceSerializedDocument: replaceSerializedDocument,
      getState: getState,
      getActiveFacing: getActiveFacing,
      getActiveLayer: getActiveLayer,
      setActiveFacing: setActiveFacing,
      setActiveLayer: setActiveLayer,
      addLayer: addLayer,
      duplicateLayer: duplicateLayer,
      removeLayer: removeLayer,
      moveLayer: moveLayer,
      renameLayer: renameLayer,
      setLayerVisibility: setLayerVisibility,
      setLayerOpacity: setLayerOpacity,
      setLayerLocked: setLayerLocked,
      translateActiveLayer: translateActiveLayer,
      clearLayer: clearLayer,
      resize: resize,
      importPixels: importPixels,
      copyFacingTo: copyFacingTo,
      setTool: setTool,
      setPrimaryColor: setPrimaryColor,
      setSecondaryColor: setSecondaryColor,
      applyToolAt: applyToolAt,
      drawLine: drawLine,
      drawRect: drawRect,
      beginTransaction: beginTransaction,
      commitTransaction: commitTransaction,
      cancelTransaction: cancelTransaction,
      drawPoint: drawPoint,
      undo: undo,
      redo: redo
    };
  }

  var api = { VERSION: VERSION, createController: createController };
  global.__HZH_PIXEL_ART_WORKFLOW__ = api;
  if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
    global.__APP_NAMESPACE.bind('application.pixelArtWorkflow', api, { owner: 'src/application/assets/pixel-art-workflow-controller.js', phase: 'asset-editor-v2' });
  }
})(typeof window !== 'undefined' ? window : globalThis);
