(function () {
  var VERSION = 'P3-C-selectors-v1';
  var DOCS = ['docs/STATE_INVENTORY.zh-CN.md', 'docs/STATE_OWNER_MAP.zh-CN.md'];
  var WRITE_STATS = (typeof window !== 'undefined' && window.__P3_STATE_WRITE_STATS)
    ? window.__P3_STATE_WRITE_STATS
    : { total: 0, byOwner: {}, byAction: {}, recent: [] };
  var CATEGORIES = [
    {
      id: 'runtimeInteraction',
      label: '运行时 / 交互状态',
      scope: 'main-runtime',
      owner: 'src/core/state/runtime-state.js',
      roots: ['App.state.runtimeState', 'App.state.selectors'],
      keys: ['debugState', 'shadowProbeState', 'keys', 'mouse', 'camera', 'settings', 'player', 'editor', 'inspectorState'],
      writeApis: ['setEditorModeValue', 'setSelectedInstanceIdValue', 'patchInspectorState', 'setCamera'],
      readPaths: ['App.state.runtimeState.summarize()', 'App.state.selectors.getRuntimeSummary()', 'App.state.selectors.getEditorMode()'],
      notes: 'P3-B 已开始收口 mode / selection / camera 等高频写路径。'
    },
    {
      id: 'prefabRegistry',
      label: 'Prefab 注册表',
      scope: 'main-runtime',
      owner: 'src/core/state/prefab-registry.js',
      roots: ['App.state.prefabRegistry'],
      keys: ['prototypes', 'normalizePrefab', 'ensurePrefabRegistered', 'getPrefabById', 'prefabVariant'],
      writeApis: ['registerPrefab', 'replacePrefabById', 'setSelectedPrototypeIndex', 'setSelectedPrefabId', 'refreshPrototypeSelection'],
      readPaths: ['App.state.prefabRegistry.getPrototypes()', 'App.state.prefabRegistry.summarize()', 'App.state.selectors.getSelectedPrefab()', 'App.state.selectors.getSelectedPrefabViewModel()'],
      notes: '编辑器回流、Habbo 导入、asset 扫描的高频 prefab 写路径已开始统一。'
    },
    {
      id: 'lightingState',
      label: '灯光状态',
      scope: 'main-runtime',
      owner: 'src/core/lighting/lighting-state.js',
      roots: ['App.state.lightingState'],
      keys: ['lights', 'lightState', 'activeLightId', 'lightingSystemEnabled', 'ambientStrength'],
      writeApis: ['applyLightingPreset', 'set* via lighting ui bindings'],
      readPaths: ['App.state.lightingState.getLights()', 'App.state.lightingState.getLightState()'],
      notes: '灯光暂未纳入本轮 P3-B 收口重点。'
    },
    {
      id: 'sceneGraph',
      label: '场景实例 / 盒体 / 世界会话状态',
      scope: 'main-runtime',
      owner: 'src/core/state/scene-session-state.js',
      roots: ['App.state.sceneGraph', 'App.state.sceneSession', 'window.instances', 'window.boxes'],
      keys: ['instances', 'boxes', 'nextId', 'nextInstanceSerial', 'defaultInstances()', 'scene reset/apply path'],
      writeApis: ['replaceSceneGraph', 'addInstance', 'removeInstanceById', 'removeLooseBoxById', 'restoreDefaultScene', 'ensureNonEmptyScene', 'syncDerivedState', 'applySceneSnapshotWithOwnership'],
      readPaths: ['buildSceneSnapshot()', 'scene-io summaries', 'App.state.selectors.getSceneSummary()', 'App.state.sceneSession.summarizeWrites()'],
      notes: 'P9-A 把 scene/session owner 从 state.js 前移到独立模块，并让回放可直接读取 owner 写摘要。'
    },
    {
      id: 'domRegistry',
      label: 'DOM 注册表',
      scope: 'ui-shell',
      owner: 'src/presentation/shell/dom-registry.js',
      roots: ['App.shell.domRegistry'],
      keys: ['canvas', 'ctx', 'ui.*'],
      writeApis: ['DOM 绑定只在启动时写入'],
      readPaths: ['App.shell.domRegistry.getKeyCount()', 'App.shell.domRegistry.getMissingKeys()', 'App.state.selectors.getDomSummary()'],
      notes: '只负责缓存 DOM 引用，不负责业务状态。'
    },
    {
      id: 'assetBrowserSession',
      label: '资源浏览 / 导入会话状态',
      scope: 'main-runtime',
      owner: 'src/infrastructure/assets/asset-management.js',
      roots: ['module-local caches'],
      keys: ['habbo summary/page cache', 'asset scan request state', 'library query/request reuse'],
      writeApis: ['fetchHabboLibrarySummary', 'fetchHabboLibraryPage', 'scanAssetPrefabs'],
      readPaths: ['request-orchestration logs', 'asset scan status ui'],
      notes: '这部分仍有模块内状态，但已开始改用 prefab owner API。'
    },
    {
      id: 'sceneServiceBoundary',
      label: 'Scene / Prefab / Habbo 服务边界',
      scope: 'service-boundary',
      owner: 'src/services/*.js + server/local_server.py',
      roots: ['App.services.sceneApi', 'App.services.prefabApi', 'App.services.habboApi', 'App.services.assetApi'],
      keys: ['fetch wrappers', 'route ownership', 'request orchestration'],
      writeApis: ['service api methods'],
      readPaths: ['P0 service diagnostics', 'request:start/response logs'],
      notes: '严格来说不是状态容器，但它定义了状态读写跨边界的入口。'
    },
    {
      id: 'editorSession',
      label: '编辑器会话状态',
      scope: 'editor-only',
      owner: 'src/presentation/editor/editor-unified-v18.js',
      roots: ['App.editor.unifiedV18', 'editor local state'],
      keys: ['id', 'name', 'renderMode', 'interactionMode', 'sprite', 'spriteFit', 'anchor', 'gridW', 'gridH', 'currentLayer', 'voxels', 'tool', 'hoverCell', 'selection', 'sidebarStep'],
      writeApis: ['editor UI handlers inside src/presentation/editor/editor-unified-v18.js'],
      readPaths: ['editor export snapshot', 'json preview'],
      notes: '这是编辑器独立状态，不应该和主程序运行时状态混写。'
    }
  ];

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return value; }
  }

  function countBy(items, key) {
    var out = {};
    (items || []).forEach(function (item) {
      var bucket = item && item[key] ? String(item[key]) : 'unknown';
      out[bucket] = (out[bucket] || 0) + 1;
    });
    return out;
  }

  function uniqueOwners(items) {
    var seen = {};
    (items || []).forEach(function (item) {
      if (!item || !item.owner) return;
      seen[String(item.owner)] = true;
    });
    return Object.keys(seen);
  }

  function emitP3(kind, message, extra) {
    var line = '[P3][' + String(kind || 'BOOT') + '] ' + String(message || '');
    if (typeof extra !== 'undefined') {
      try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
    }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (_) {}
    return line;
  }

  function trimRecent() {
    if (!Array.isArray(WRITE_STATS.recent)) WRITE_STATS.recent = [];
    if (WRITE_STATS.recent.length > 20) WRITE_STATS.recent = WRITE_STATS.recent.slice(WRITE_STATS.recent.length - 20);
  }

  function recordWrite(owner, action, extra) {
    owner = String(owner || 'unknown-owner');
    action = String(action || 'unknown-action');
    WRITE_STATS.total = Number(WRITE_STATS.total || 0) + 1;
    WRITE_STATS.byOwner[owner] = (WRITE_STATS.byOwner[owner] || 0) + 1;
    WRITE_STATS.byAction[action] = (WRITE_STATS.byAction[action] || 0) + 1;
    WRITE_STATS.recent.push({
      at: new Date().toISOString(),
      owner: owner,
      action: action,
      source: extra && extra.source ? String(extra.source) : 'unknown',
      detail: clone(extra || null)
    });
    trimRecent();
    emitP3('BOUNDARY', 'state-write-path-bound', Object.assign({ owner: owner, action: action }, clone(extra || {})));
    return summarizeWriteOwners();
  }

  function summarizeWriteOwners() {
    return {
      phase: 'P3-C',
      version: VERSION,
      totalWrites: Number(WRITE_STATS.total || 0),
      ownerCount: Object.keys(WRITE_STATS.byOwner || {}).length,
      byOwner: clone(WRITE_STATS.byOwner || {}),
      byAction: clone(WRITE_STATS.byAction || {}),
      recent: clone((WRITE_STATS.recent || []).slice(-10)),
      writeApis: {
        runtimeState: ['setEditorModeValue', 'setSelectedInstanceIdValue', 'patchInspectorState', 'setCamera'],
        prefabRegistry: ['registerPrefab', 'replacePrefabById', 'setSelectedPrototypeIndex', 'setSelectedPrefabId', 'refreshPrototypeSelection'],
        sceneGraph: ['replaceSceneGraph', 'addInstance', 'removeInstanceById', 'removeLooseBoxById', 'restoreDefaultScene', 'ensureNonEmptyScene', 'syncDerivedState', 'applySceneSnapshotWithOwnership']
      }
    };
  }

  function buildInventorySummary() {
    var owners = uniqueOwners(CATEGORIES);
    return {
      phase: 'P3-C',
      version: VERSION,
      docs: DOCS.slice(),
      categoryCount: CATEGORIES.length,
      ownerCount: owners.length,
      scopes: countBy(CATEGORIES, 'scope'),
      owners: owners,
      categories: CATEGORIES.map(function (item) {
        return {
          id: item.id,
          label: item.label,
          scope: item.scope,
          owner: item.owner,
          keyCount: Array.isArray(item.keys) ? item.keys.length : 0,
          roots: clone(item.roots || []),
          writeApis: clone(item.writeApis || [])
        };
      })
    };
  }

  function getAppRoot() {
    return (typeof window !== 'undefined' && window.App) ? window.App : null;
  }

  function summarizeMainDashboard() {
    var app = getAppRoot();
    var runtimeApi = app && app.state ? app.state.runtimeState : null;
    var prefabApi = app && app.state ? app.state.prefabRegistry : null;
    var lightingApi = app && app.state ? app.state.lightingState : null;
    var domApi = app && app.shell ? app.shell.domRegistry : null;
    var sceneGraphApi = app && app.state ? app.state.sceneGraph : null;
    var sceneSessionApi = app && app.state ? app.state.sceneSession : null;
    var entry = (typeof window !== 'undefined' && (window.__APP_ENTRY_INFO_RESOLVED || window.__APP_ENTRY_INFO)) ? (window.__APP_ENTRY_INFO_RESOLVED || window.__APP_ENTRY_INFO) : null;
    return {
      phase: 'P3-C',
      entry: entry,
      roots: {
        runtimeState: !!runtimeApi,
        prefabRegistry: !!prefabApi,
        lightingState: !!lightingApi,
        domRegistry: !!domApi,
        sceneGraph: !!sceneGraphApi,
        sceneSession: !!sceneSessionApi,
        services: !!(app && app.services)
      },
      runtimeSummary: runtimeApi && typeof runtimeApi.summarize === 'function' ? runtimeApi.summarize() : null,
      sceneSummary: sceneGraphApi && typeof sceneGraphApi.summarize === 'function'
        ? sceneGraphApi.summarize()
        : {
            instances: Array.isArray(typeof instances !== 'undefined' ? instances : null) ? instances.length : null,
            boxes: Array.isArray(typeof boxes !== 'undefined' ? boxes : null) ? boxes.length : null,
            lights: Array.isArray(typeof lights !== 'undefined' ? lights : null) ? lights.length : null
          },
      sceneSessionSummary: sceneSessionApi && typeof sceneSessionApi.summarizeSession === 'function'
        ? sceneSessionApi.summarizeSession()
        : null,
      sceneSessionWrites: sceneSessionApi && typeof sceneSessionApi.summarizeWrites === 'function'
        ? sceneSessionApi.summarizeWrites('owner-map-dashboard')
        : null,
      prefabSummary: prefabApi && typeof prefabApi.summarize === 'function'
        ? prefabApi.summarize()
        : { prototypeCount: Array.isArray(typeof prototypes !== 'undefined' ? prototypes : null) ? prototypes.length : null },
      lightingSummary: lightingApi
        ? {
            lightCount: typeof lightingApi.getLights === 'function' ? (lightingApi.getLights() || []).length : null,
            activeLightId: typeof lightingApi.getActiveLightId === 'function' ? lightingApi.getActiveLightId() : null,
            lightingEnabled: typeof lightingApi.isLightingSystemEnabled === 'function' ? lightingApi.isLightingSystemEnabled() : null
          }
        : null,
      domSummary: domApi
        ? {
            keyCount: typeof domApi.getKeyCount === 'function' ? domApi.getKeyCount() : null,
            missingKeyCount: typeof domApi.getMissingKeys === 'function' ? (domApi.getMissingKeys() || []).length : null
          }
        : null,
      writeSummary: summarizeWriteOwners()
    };
  }

  function summarizeEditorDashboard(extra) {
    var entry = (typeof window !== 'undefined' && (window.__APP_ENTRY_INFO_RESOLVED || window.__APP_ENTRY_INFO)) ? (window.__APP_ENTRY_INFO_RESOLVED || window.__APP_ENTRY_INFO) : null;
    return {
      phase: 'P3-C',
      entry: entry,
      roots: {
        editorRoot: !!(typeof window !== 'undefined' && window.App && window.App.editor && window.App.editor.unifiedV18),
        namespace: !!(typeof window !== 'undefined' && window.__APP_NAMESPACE),
        serviceRoot: !!(typeof window !== 'undefined' && window.App && window.App.services),
        stateRoot: !!(typeof window !== 'undefined' && window.App && window.App.state)
      },
      editorState: clone(extra || null),
      writeSummary: summarizeWriteOwners()
    };
  }

  var api = {
    phase: 'P3-C',
    version: VERSION,
    docs: DOCS.slice(),
    categories: clone(CATEGORIES),
    emitP3: emitP3,
    recordWrite: recordWrite,
    summarizeInventory: buildInventorySummary,
    summarizeMainDashboard: summarizeMainDashboard,
    summarizeEditorDashboard: summarizeEditorDashboard,
    summarizeWriteOwners: summarizeWriteOwners
  };

  if (typeof window !== 'undefined') {
    window.__P3_STATE_WRITE_STATS = WRITE_STATS;
    window.__STATE_OWNER_MAP__ = api;
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('debug.stateOwnerMap', api, { owner: 'src/core/state/state-owner-map.js', phase: 'P3-C' });
    }
  }
})();
