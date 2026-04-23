(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/infrastructure/logging/item-rotation-diagnostic-log.js';
  var PHASE = 'ITEM-ROTATION-PREVIEW-S1';
  var MAX = 400;
  var entries = [];
  var counters = {};

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function nowIso() {
    try { return new Date().toISOString(); } catch (_) { return ''; }
  }

  function record(kind, payload) {
    var name = String(kind || 'event');
    counters[name] = (counters[name] || 0) + 1;
    var entry = {
      time: nowIso(),
      kind: name,
      payload: clone(payload || null)
    };
    entries.push(entry);
    if (entries.length > MAX) entries.splice(0, entries.length - MAX);
    return entry;
  }

  function summarize(label) {
    return {
      owner: OWNER,
      phase: PHASE,
      label: String(label || ''),
      counters: clone(counters),
      latest: entries.length ? clone(entries[entries.length - 1]) : null,
      recent: entries.slice(-80).map(clone)
    };
  }

  function reset(meta) {
    entries = [];
    counters = {};
    record('reset', meta || { source: 'item-rotation-diagnostic:reset' });
    return summarize('after-reset');
  }

  function buildExportPayload(label, extra) {
    return {
      schema: 'main-view-rotation-diagnostic-log/v1',
      owner: OWNER,
      phase: PHASE,
      exportedAt: nowIso(),
      label: String(label || ''),
      counters: clone(counters),
      entries: entries.map(clone),
      extra: clone(extra || null)
    };
  }

  function download(label, extra) {
    var payload = buildExportPayload(label, extra);
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var anchor = document.createElement('a');
    var href = URL.createObjectURL(blob);
    anchor.href = href;
    anchor.download = 'main_view_rotation_diagnostic_log.json';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(function () {
      try { URL.revokeObjectURL(href); } catch (_) {}
      try { anchor.remove(); } catch (_) {}
    }, 0);
    record('diagnostic-export', { filename: anchor.download, label: label || '', extraKeys: extra ? Object.keys(extra) : [] });
    return payload;
  }

  var api = { owner: OWNER, phase: PHASE, record: record, summarize: summarize, reset: reset, buildExportPayload: buildExportPayload, download: download };
  window.__ITEM_ROTATION_DIAGNOSTIC__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('infrastructure.itemRotationDiagnostic', api, { owner: OWNER, phase: PHASE });
  }
})();
