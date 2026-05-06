// P11d-4: Habbo root config service owner.
// Owns Habbo root config get/set sanitization and in-flight state orchestration.
(function installHabboRootConfigService(global) {
  'use strict';

  var OWNER = 'src/infrastructure/assets/habbo-root-config-service.js';

  function safeDeps(deps) { return deps || {}; }
  function call(deps, name) {
    var args = Array.prototype.slice.call(arguments, 2);
    var fn = deps && deps[name];
    if (typeof fn !== 'function') return undefined;
    return fn.apply(null, args);
  }
  function getRootState(deps) {
    return call(deps, 'getRootState') || { configured: false, root: '', exists: false, itemCount: 0, lastError: '', fetchedAt: 0 };
  }
  function setRootState(deps, state) {
    if (typeof deps.setRootState === 'function') return deps.setRootState(state);
    return state;
  }
  function log(deps, message) {
    if (typeof deps.habboLibraryLog === 'function') deps.habboLibraryLog(message);
  }
  function requestLog(deps, kind, detail) {
    if (typeof deps.logRequestOrchestration === 'function') deps.logRequestOrchestration(kind, detail || {});
  }
  function sanitizeHabboAssetRootInput(rootPath, existingRoot) {
    var raw = String(rootPath == null ? '' : rootPath).trim();
    if (!raw) return { value: '', normalized: false, reason: 'empty' };
    var value = raw;
    if ((value.startsWith('\"') && value.endsWith('\"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).trim();
    }
    var normalized = value !== raw;
    var reason = normalized ? 'trimmed-quotes' : '';
    var existing = String(existingRoot || '').trim();
    if (existing) {
      var doubledExisting = existing + existing;
      if (value === doubledExisting) {
        value = existing;
        normalized = true;
        reason = 'dedup-existing-root-repeat';
      }
    }
    if (value.length % 2 === 0) {
      var half = value.slice(0, value.length / 2);
      if (half && half === value.slice(value.length / 2)) {
        value = half;
        normalized = true;
        reason = reason || 'dedup-double-string';
      }
    }
    return { value: value, normalized: normalized, reason: reason || '' };
  }
  function getHabboRootConfigInFlightState(deps) {
    deps = safeDeps(deps);
    return {
      inFlight: !!call(deps, 'getInFlightPromise'),
      requestId: Number(call(deps, 'getInFlightRequestId') || 0) || 0,
      pendingRoot: String(call(deps, 'getPendingRoot') || '')
    };
  }
  async function awaitHabboRootConfigInFlight(source, deps) {
    deps = safeDeps(deps);
    var promise = call(deps, 'getInFlightPromise');
    if (!promise) return null;
    log(deps, 'habbo-root:await-config source=' + String(source || 'unknown') + ' requestId=' + Number(call(deps, 'getInFlightRequestId') || 0) + ' pendingRoot=' + String(call(deps, 'getPendingRoot') || ''));
    try { return await promise; } catch (_) { return null; }
  }
  async function fetchHabboAssetRootConfig(options, deps) {
    deps = safeDeps(deps);
    options = options || {};
    var workflow = (typeof deps.shouldUseAssetWorkflowCompat === 'function' && deps.shouldUseAssetWorkflowCompat(options) && typeof deps.getAssetWorkflowCompatApi === 'function')
      ? deps.getAssetWorkflowCompatApi()
      : null;
    if (workflow && typeof workflow.ensureHabboRootReady === 'function') {
      await workflow.ensureHabboRootReady(Object.assign({}, options, { __fromLegacyCompat: true, source: options.source || 'asset-management:compat:ensureHabboRootReady' }));
      return getRootState(deps);
    }
    if (typeof deps.habboRootSupported === 'function' && !deps.habboRootSupported()) {
      var unsupportedState = { configured: false, root: '', exists: false, itemCount: 0, lastError: 'server-mode-unavailable', fetchedAt: Date.now() };
      setRootState(deps, unsupportedState);
      call(deps, 'updateHabboRootStatus');
      return getRootState(deps);
    }
    var requestId = call(deps, 'nextRequestId') || 0;
    log(deps, 'habbo-root:get:start requestId=' + requestId + ' silent=' + (!!options.silent));
    requestLog(deps, 'start', { owner: deps.owner || OWNER, flow: 'habbo-root-config:get', requestId: requestId, silent: !!options.silent });
    try {
      var habboApi = call(deps, 'getHabboApiAdapter');
      var configResult = await habboApi.getConfig({ requestId: requestId, silent: !!options.silent });
      var res = configResult.response;
      var data = configResult.data;
      if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status));
      var nextState = {
        configured: !!data.configured,
        root: String(data.root || ''),
        exists: !!data.exists,
        itemCount: Number.isFinite(Number(data.itemCount)) ? Number(data.itemCount) : 0,
        lastError: '',
        fetchedAt: Date.now(),
      };
      setRootState(deps, nextState);
      log(deps, 'habbo-root:get:done requestId=' + requestId + ' root=' + nextState.root + ' count=' + nextState.itemCount);
      requestLog(deps, 'done', { owner: deps.owner || OWNER, flow: 'habbo-root-config:get', requestId: requestId, configured: !!nextState.configured, exists: !!nextState.exists, itemCount: nextState.itemCount });
    } catch (err) {
      log(deps, 'habbo-root:get:error requestId=' + requestId + ' ' + String(err && err.message ? err.message : err));
      if (err && err.stack) log(deps, 'habbo-root:get:stack requestId=' + requestId + ' stack=' + String(err.stack).split('\n').slice(0, 6).join(' | '));
      requestLog(deps, 'skipped', { owner: deps.owner || OWNER, flow: 'habbo-root-config:get', requestId: requestId, reason: String(err && err.message ? err.message : err) });
      setRootState(deps, {
        configured: false,
        root: '',
        exists: false,
        itemCount: 0,
        lastError: String(err && err.message ? err.message : err),
        fetchedAt: Date.now(),
      });
    }
    if (!options.silent) call(deps, 'updateHabboRootStatus');
    return getRootState(deps);
  }
  async function setHabboAssetRootConfig(rootPath, deps) {
    deps = safeDeps(deps);
    if (typeof deps.habboRootSupported === 'function' && !deps.habboRootSupported()) {
      call(deps, 'updateHabboRootStatus');
      throw new Error('当前不是本地 server 模式，无法设置 Habbo 根目录');
    }
    var normalizedInput = sanitizeHabboAssetRootInput(rootPath, getRootState(deps).root);
    var root = normalizedInput.value;
    var requestId = call(deps, 'nextRequestId') || 0;
    call(deps, 'setInFlightRequestId', requestId);
    call(deps, 'setPendingRoot', String(root || ''));
    log(deps, 'habbo-root:set:start requestId=' + requestId + ' root=' + root);
    if (normalizedInput.normalized) log(deps, 'habbo-root:set:normalized requestId=' + requestId + ' reason=' + normalizedInput.reason + ' value=' + root);
    if (!root) {
      call(deps, 'updateHabboRootStatus', 'Habbo 根目录设置失败：路径为空');
      call(deps, 'setPendingRoot', '');
      throw new Error('Habbo 根目录不能为空');
    }
    var promise = (async function () {
      try {
        call(deps, 'updateHabboRootStatus', 'Habbo 根目录设置中：' + root + ' · 正在等待 server 确认……');
        var habboApi = call(deps, 'getHabboApiAdapter');
        var configResult = await habboApi.setConfig(root, { requestId: requestId });
        var res = configResult.response;
        log(deps, 'habbo-root:set:response requestId=' + requestId + ' status=' + res.status);
        var rawText = configResult.rawText || '';
        log(deps, 'habbo-root:set:text requestId=' + requestId + ' bytes=' + rawText.length);
        var data = configResult.data;
        log(deps, 'habbo-root:set:json requestId=' + requestId + ' configured=' + String(!!(data && data.configured)) + ' exists=' + String(!!(data && data.exists)));
        if (!res.ok || !data || data.ok === false) throw new Error((data && data.error) || ('HTTP ' + res.status));
        var nextState = {
          configured: !!data.configured,
          root: String(data.root || ''),
          exists: !!data.exists,
          itemCount: Number.isFinite(Number(data.itemCount)) ? Number(data.itemCount) : 0,
          lastError: '',
          fetchedAt: Date.now(),
        };
        setRootState(deps, nextState);
        call(deps, 'updateHabboRootStatus', 'Habbo 根目录已设置为：' + nextState.root + (nextState.exists ? (' · 当前检测到 ' + nextState.itemCount + ' 个 SWF') : ' · 但路径暂不存在'));
        if (typeof deps.pushLog === 'function') deps.pushLog('habbo-root:set root=' + nextState.root + ' exists=' + nextState.exists + ' count=' + nextState.itemCount);
        log(deps, 'habbo-root:set:done requestId=' + requestId + ' root=' + nextState.root + ' count=' + nextState.itemCount);
        return getRootState(deps);
      } catch (err) {
        log(deps, 'habbo-root:set:error requestId=' + requestId + ' ' + String(err && err.message ? err.message : err));
        if (err && err.stack) log(deps, 'habbo-root:set:stack requestId=' + requestId + ' stack=' + String(err.stack).split('\n').slice(0, 6).join(' | '));
        call(deps, 'updateHabboRootStatus', 'Habbo 根目录设置失败：' + (err && err.message ? err.message : err));
        throw err;
      } finally {
        call(deps, 'setPendingRoot', '');
        if (Number(call(deps, 'getInFlightRequestId') || 0) === requestId) call(deps, 'setInFlightRequestId', 0);
        var currentPromise = call(deps, 'getInFlightPromise');
        if (currentPromise && currentPromise.__requestId === requestId) call(deps, 'setInFlightPromise', null);
      }
    })();
    promise.__requestId = requestId;
    call(deps, 'setInFlightPromise', promise);
    return await promise;
  }

  global.__HABBO_ROOT_CONFIG_SERVICE__ = {
    owner: OWNER,
    sanitizeHabboAssetRootInput: sanitizeHabboAssetRootInput,
    getHabboRootConfigInFlightState: getHabboRootConfigInFlightState,
    awaitHabboRootConfigInFlight: awaitHabboRootConfigInFlight,
    fetchHabboAssetRootConfig: fetchHabboAssetRootConfig,
    setHabboAssetRootConfig: setHabboAssetRootConfig
  };
})(typeof window !== 'undefined' ? window : globalThis);
