(function (global) {
  'use strict';

  var VERSION = 'HZH-BEHAVIOR-EDITOR-V1';
  var editorApi = null;
  var behavior = null;
  var libraryItems = [];
  var selectedLibraryItem = null;
  var syncTimer = 0;
  var completionItems = [];
  var completionIndex = 0;

  function byId(id) { return document.getElementById(id); }
  var ui = {
    workspace: byId('behaviorWorkspace'),
    prefabIdentity: byId('behaviorPrefabIdentity'),
    addCommand: byId('behaviorAddCommand'),
    addEvent: byId('behaviorAddEvent'),
    commandList: byId('behaviorCommandList'),
    eventList: byId('behaviorEventList'),
    capabilities: byId('behaviorCapabilities'),
    script: byId('behaviorScript'),
    lineNumbers: byId('behaviorLineNumbers'),
    cursorStatus: byId('behaviorCursorStatus'),
    syncStatus: byId('behaviorSyncStatus'),
    formatTemplate: byId('behaviorFormatTemplate'),
    toggleStateTemplate: byId('behaviorToggleStateTemplate'),
    saveDraft: byId('behaviorSaveDraft'),
    autocomplete: byId('behaviorAutocomplete'),
    refreshLibrary: byId('behaviorRefreshLibrary'),
    librarySearch: byId('behaviorLibrarySearch'),
    libraryStatus: byId('behaviorLibraryStatus'),
    libraryResults: byId('behaviorLibraryResults'),
    targetTitle: byId('behaviorTargetTitle'),
    targetMeta: byId('behaviorTargetMeta'),
    targetInterfaces: byId('behaviorTargetInterfaces'),
    gameApiList: byId('behaviorGameApiList'),
    saveBehaviorSummary: byId('saveBehaviorSummary')
  };

  var GAME_API = [
    { label: '增加金币', signature: 'game.economy:addGold(actor, amount)', snippet: 'game.economy:addGold(actor, 10)', kind: 'game' },
    { label: '增加经验', signature: 'game.progression:addExperience(actor, amount)', snippet: 'game.progression:addExperience(actor, 100)', kind: 'game' },
    { label: '设置场景标记', signature: 'scene:setFlag(key, value)', snippet: 'scene:setFlag("flag_name", true)', kind: 'scene' },
    { label: '生成素材', signature: 'world:spawnPrefab(prefabId, position)', snippet: 'world:spawnPrefab("prefab_id", self.position)', kind: 'world' },
    { label: '按素材查找', signature: 'world:findByPrefab(prefabId)', snippet: 'world:findByPrefab("prefab_id")', kind: 'world' },
    { label: '修改自身状态', signature: 'self:setState(stateId)', snippet: 'self:setState("state_id")', kind: 'self' },
    { label: '播放动画', signature: 'self:playAnimation(name)', snippet: 'self:playAnimation("animation_name")', kind: 'self' },
    { label: '发出事件', signature: 'self:emit(name, payload)', snippet: 'self:emit("event_name")', kind: 'self' }
  ];

  function getEditorApi() {
    return global.App && global.App.editor && global.App.editor.unifiedV18 ? global.App.editor.unifiedV18 : null;
  }

  function safeClone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
  }

  function blankBehavior() {
    return {
      version: 'hzh-behavior-v1',
      language: 'lua',
      script: '',
      capabilities: [],
      publicApi: { commands: [], events: [] },
      properties: [],
      references: []
    };
  }

  function normalizeApiList(items) {
    return (Array.isArray(items) ? items : []).map(function (item) {
      if (typeof item === 'string') return { name: item, args: '', description: '' };
      return {
        name: String(item && item.name || '').trim(),
        args: String(item && item.args || '').trim(),
        description: String(item && item.description || '').trim()
      };
    }).filter(function (item) { return !!item.name; });
  }

  function normalizeBehavior(raw) {
    var base = blankBehavior();
    var value = raw && typeof raw === 'object' ? (safeClone(raw) || {}) : {};
    var publicApi = value.publicApi && typeof value.publicApi === 'object' ? value.publicApi : {};
    return {
      version: String(value.version || base.version),
      language: String(value.language || 'lua'),
      script: String(value.script || ''),
      capabilities: Array.isArray(value.capabilities) ? value.capabilities.map(function (x) { return String(x || '').trim(); }).filter(Boolean) : [],
      publicApi: {
        commands: normalizeApiList(publicApi.commands || value.commands),
        events: normalizeApiList(publicApi.events || value.events)
      },
      properties: Array.isArray(value.properties) ? value.properties : [],
      references: Array.isArray(value.references) ? value.references : []
    };
  }

  function getPrefabDraft() {
    editorApi = getEditorApi();
    return editorApi && typeof editorApi.getPrefabDraft === 'function' ? editorApi.getPrefabDraft() : null;
  }

  function loadFromPrefab() {
    editorApi = getEditorApi();
    var incoming = editorApi && typeof editorApi.getBehaviorDraft === 'function' ? editorApi.getBehaviorDraft() : null;
    behavior = normalizeBehavior(incoming);
    renderBehavior();
    updatePrefabIdentity();
    setSyncStatus('已同步');
  }

  function updatePrefabIdentity() {
    var prefab = getPrefabDraft();
    if (!prefab) return;
    if (ui.prefabIdentity) ui.prefabIdentity.textContent = (prefab.name || prefab.id || '当前 Prefab') + ' · ' + (prefab.id || '');
  }

  function syncBehavior(immediate) {
    if (syncTimer) { clearTimeout(syncTimer); syncTimer = 0; }
    collectBehaviorFromUi();
    editorApi = getEditorApi();
    if (editorApi && typeof editorApi.setBehaviorDraft === 'function') {
      behavior = normalizeBehavior(editorApi.setBehaviorDraft(behavior));
      setSyncStatus('已同步到 Prefab 草稿');
      updateSaveSummary();
      return true;
    }
    setSyncStatus('无法同步', false);
    return false;
  }

  function flushBehavior() {
    syncTimer = 0;
    collectBehaviorFromUi();
    editorApi = getEditorApi();
    if (!editorApi || typeof editorApi.setBehaviorDraft !== 'function') {
      setSyncStatus('无法同步', false);
      return false;
    }
    behavior = normalizeBehavior(editorApi.setBehaviorDraft(behavior));
    setSyncStatus('已同步');
    updateSaveSummary();
    return true;
  }

  function setSyncStatus(text, ok) {
    if (!ui.syncStatus) return;
    ui.syncStatus.textContent = String(text || '');
    ui.syncStatus.dataset.ok = ok === false ? 'false' : 'true';
  }

  function collectBehaviorFromUi() {
    if (!behavior) behavior = blankBehavior();
    behavior.script = ui.script ? String(ui.script.value || '') : behavior.script;
    behavior.capabilities = ui.capabilities ? String(ui.capabilities.value || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean) : behavior.capabilities;
    behavior.publicApi.commands = readApiList(ui.commandList);
    behavior.publicApi.events = readApiList(ui.eventList);
    return behavior;
  }

  function readApiList(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll('.behaviorApiItem')).map(function (row) {
      var name = row.querySelector('[data-api-name]');
      var args = row.querySelector('[data-api-args]');
      return {
        name: String(name && name.value || '').trim(),
        args: String(args && args.value || '').trim(),
        description: String(row.dataset.description || '').trim()
      };
    }).filter(function (item) { return !!item.name; });
  }

  function renderBehavior() {
    behavior = normalizeBehavior(behavior);
    if (ui.script) ui.script.value = behavior.script;
    if (ui.capabilities) ui.capabilities.value = behavior.capabilities.join(', ');
    renderApiList(ui.commandList, behavior.publicApi.commands, 'command');
    renderApiList(ui.eventList, behavior.publicApi.events, 'event');
    updateLineNumbers();
    updateCursorStatus();
    updateSaveSummary();
  }

  function renderApiList(container, items, kind) {
    if (!container) return;
    container.innerHTML = '';
    (items || []).forEach(function (item) { appendApiRow(container, item, kind); });
    if (!(items || []).length) {
      var empty = document.createElement('div');
      empty.className = 'behaviorEmptyState';
      empty.textContent = kind === 'command' ? '尚未暴露 Command。' : '尚未声明 Event。';
      empty.dataset.apiEmpty = 'true';
      container.appendChild(empty);
    }
  }

  function appendApiRow(container, item, kind, focus) {
    if (!container) return;
    var empty = container.querySelector('[data-api-empty]');
    if (empty) empty.remove();
    var row = document.createElement('div');
    row.className = 'behaviorApiItem';
    row.dataset.kind = kind;
    row.dataset.description = String(item && item.description || '');
    var top = document.createElement('div');
    top.className = 'behaviorApiItemTop';
    var name = document.createElement('input');
    name.dataset.apiName = '1';
    name.value = String(item && item.name || (kind === 'command' ? 'newCommand' : 'newEvent'));
    name.placeholder = kind === 'command' ? 'commandName' : 'eventName';
    var remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'behaviorDeleteApi'; remove.title = '删除'; remove.textContent = '×';
    top.appendChild(name); top.appendChild(remove);
    var args = document.createElement('input');
    args.dataset.apiArgs = '1'; args.className = 'behaviorArgsInput';
    args.value = String(item && item.args || '');
    args.placeholder = kind === 'command' ? '参数，例如 actor, amount' : '事件载荷，例如 actor';
    row.appendChild(top); row.appendChild(args); container.appendChild(row);
    function changed() { syncBehavior(false); }
    name.addEventListener('input', changed); args.addEventListener('input', changed);
    remove.addEventListener('click', function () { row.remove(); ensureApiEmpty(container, kind); syncBehavior(true); });
    if (focus) setTimeout(function () { name.focus(); name.select(); }, 0);
  }

  function ensureApiEmpty(container, kind) {
    if (!container || container.querySelector('.behaviorApiItem')) return;
    var empty = document.createElement('div'); empty.className = 'behaviorEmptyState'; empty.dataset.apiEmpty = 'true';
    empty.textContent = kind === 'command' ? '尚未暴露 Command。' : '尚未声明 Event。'; container.appendChild(empty);
  }

  function addApi(kind) {
    var container = kind === 'command' ? ui.commandList : ui.eventList;
    appendApiRow(container, { name: kind === 'command' ? 'newCommand' : 'newEvent', args: '' }, kind, true);
    syncBehavior(false);
  }

  function updateLineNumbers() {
    if (!ui.script || !ui.lineNumbers) return;
    var count = Math.max(1, String(ui.script.value || '').split('\n').length);
    var lines = [];
    for (var i = 1; i <= count; i += 1) lines.push(String(i));
    ui.lineNumbers.textContent = lines.join('\n');
    updateSaveSummary();
  }

  function updateCursorStatus() {
    if (!ui.script || !ui.cursorStatus) return;
    var before = ui.script.value.slice(0, ui.script.selectionStart || 0);
    var parts = before.split('\n');
    ui.cursorStatus.textContent = 'Ln ' + parts.length + ', Col ' + (parts[parts.length - 1].length + 1);
  }

  function updateSaveSummary() {
    if (!ui.saveBehaviorSummary) return;
    var current = behavior || blankBehavior();
    var script = ui.script ? ui.script.value : current.script;
    var lines = script ? script.split('\n').length : 0;
    var commands = ui.commandList ? ui.commandList.querySelectorAll('.behaviorApiItem').length : current.publicApi.commands.length;
    var caps = ui.capabilities ? String(ui.capabilities.value || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean).length : current.capabilities.length;
    ui.saveBehaviorSummary.textContent = 'Lua：' + lines + ' 行 · Commands：' + commands + ' · Capabilities：' + caps;
  }

  function insertText(text) {
    if (!ui.script) return;
    var start = ui.script.selectionStart || 0;
    var end = ui.script.selectionEnd || start;
    var value = ui.script.value;
    var snippet = String(text || '');
    ui.script.value = value.slice(0, start) + snippet + value.slice(end);
    var cursor = start + snippet.length;
    ui.script.focus(); ui.script.setSelectionRange(cursor, cursor);
    updateLineNumbers(); updateCursorStatus(); syncBehavior(false);
  }

  function insertTemplate() {
    if (!ui.script) return;
    var template = [
      '-- Prefab Behavior',
      '-- 通用能力优先使用 Components；这里只编写这个物品特有的局部规则。',
      '',
      'function onInteract(actor)',
      '  -- self:setState("state_id")',
      'end',
      ''
    ].join('\n');
    if (ui.script.value.trim()) insertText('\n' + template); else { ui.script.value = template; updateLineNumbers(); syncBehavior(false); }
  }

  function insertStateToggleTemplate() {
    if (!ui.script) return false;
    var prefab = getPrefabDraft() || {};
    var bundle = prefab.materialStates && typeof prefab.materialStates === 'object' ? prefab.materialStates : null;
    var states = bundle && Array.isArray(bundle.states) ? bundle.states : [];
    if (states.length < 2) {
      setSyncStatus('至少需要两个 State 才能生成点击切换模板', false);
      return false;
    }
    var state0 = String(states[0].id || 'state_0');
    var state1 = String(states[1].id || 'state_1');
    var template = [
      '-- State 0 = ' + String(states[0].name || state0),
      '-- State 1 = ' + String(states[1].name || state1),
      'function onClick()',
      '  if self:getState() == ' + JSON.stringify(state0) + ' then',
      '    self:setState(' + JSON.stringify(state1) + ')',
      '  else',
      '    self:setState(' + JSON.stringify(state0) + ')',
      '  end',
      'end',
      ''
    ].join('\n');
    if (ui.script.value.trim()) insertText('\n' + template); else {
      ui.script.value = template;
      updateLineNumbers(); updateCursorStatus(); syncBehavior(false);
    }
    setSyncStatus('已插入 State 0 ↔ State 1 点击模板');
    return true;
  }

  function getExternalLibraryApi() {
    return global.__HZH_EMERGENT_ASSET_LIBRARY__ || null;
  }

  function getPrefabApi() {
    return global.App && global.App.services && global.App.services.prefabApi ? global.App.services.prefabApi : null;
  }

  async function refreshLibrary() {
    var api = getPrefabApi();
    if (ui.libraryStatus) ui.libraryStatus.textContent = '正在读取素材库…';
    var collected = [];
    try {
      if (api && typeof api.fetchIndex === 'function' && /^https?:$/i.test(location.protocol)) {
        var result = await api.fetchIndex({ requestId: 'behavior-editor-' + Date.now() });
        if (result && result.response && result.response.ok && result.data && Array.isArray(result.data.items)) {
          result.data.items.forEach(function (item) {
            collected.push({ source: 'server', file: item.file, id: String(item.id || ''), name: String(item.name || item.id || item.file || ''), kind: String(item.kind || ''), inline: null });
          });
        }
      }
    } catch (err) {
      if (ui.libraryStatus) ui.libraryStatus.textContent = '项目素材扫描失败，将显示浏览器素材库：' + String(err && err.message || err);
    }
    try {
      if (api && typeof api.listBrowserLibrary === 'function') {
        (api.listBrowserLibrary({ source: 'behavior-editor' }) || []).forEach(function (prefab) {
          if (!prefab || !prefab.id) return;
          collected.push({ source: 'browser', file: '', id: String(prefab.id), name: String(prefab.name || prefab.id), kind: String(prefab.kind || ''), inline: safeClone(prefab) });
        });
      }
    } catch (_) {}
    try {
      var external = getExternalLibraryApi();
      if (external) {
        if (typeof external.fetchIndex === 'function') await external.fetchIndex();
        if (typeof external.listItems === 'function') {
          (external.listItems() || []).forEach(function (item) {
            if (!item || !item.id) return;
            collected.unshift({
              source: 'external-library', file: '', id: String(item.id), name: String(item.name || item.id), kind: String(item.kind || ''),
              inline: null, externalItem: item
            });
          });
        }
      }
    } catch (err) {
      if (ui.libraryStatus) ui.libraryStatus.textContent = '外部素材库读取失败：' + String(err && err.message || err);
    }
    var seen = new Set();
    libraryItems = collected.filter(function (item) {
      var key = item.id || item.file;
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    }).sort(function (a, b) { return a.name.localeCompare(b.name, 'zh-CN'); });
    if (ui.libraryStatus) ui.libraryStatus.textContent = libraryItems.length ? ('已读取 ' + libraryItems.length + ' 个 Prefab') : '素材库为空；保存一些 Prefab 后即可在这里搜索接口。';
    renderLibraryResults();
  }

  function renderLibraryResults() {
    if (!ui.libraryResults) return;
    var q = String(ui.librarySearch && ui.librarySearch.value || '').trim().toLowerCase();
    var visible = libraryItems.filter(function (item) {
      if (!q) return true;
      return (item.name + ' ' + item.id + ' ' + item.kind).toLowerCase().indexOf(q) >= 0;
    }).slice(0, 80);
    ui.libraryResults.innerHTML = '';
    visible.forEach(function (item) {
      var button = document.createElement('button'); button.type = 'button'; button.className = 'behaviorLibraryItem';
      if (selectedLibraryItem && selectedLibraryItem.id === item.id) button.classList.add('active');
      var name = document.createElement('strong'); name.textContent = item.name || item.id;
      var meta = document.createElement('small'); meta.textContent = item.id + (item.kind ? (' · ' + item.kind) : '');
      button.appendChild(name); button.appendChild(meta);
      button.addEventListener('click', function () { selectLibraryItem(item); });
      ui.libraryResults.appendChild(button);
    });
    if (!visible.length) {
      var empty = document.createElement('div'); empty.className = 'behaviorEmptyState'; empty.textContent = q ? '没有匹配的素材。' : '素材库为空。'; ui.libraryResults.appendChild(empty);
    }
  }

  async function loadLibraryPrefab(item) {
    if (!item) return null;
    if (item.inline) return safeClone(item.inline);
    if (item.externalItem) { var external = getExternalLibraryApi(); if (!external || typeof external.loadItem !== 'function') throw new Error('external asset library service missing'); var data = await external.loadItem(item.externalItem); return external.extractPrefab ? external.extractPrefab(data) : (data && data.prefab ? data.prefab : data); }
    if (!item.file) return null;
    var response = await fetch('assets/prefabs/' + encodeURIComponent(item.file) + '?t=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  }

  function extractPublicApi(prefab) {
    var b = normalizeBehavior(prefab && (prefab.behavior || prefab.behaviors));
    var legacy = prefab && prefab.interfaces && typeof prefab.interfaces === 'object' ? prefab.interfaces : {};
    if (!b.publicApi.commands.length && legacy.commands) b.publicApi.commands = normalizeApiList(legacy.commands);
    if (!b.publicApi.events.length && legacy.events) b.publicApi.events = normalizeApiList(legacy.events);
    return b.publicApi;
  }

  async function selectLibraryItem(item) {
    selectedLibraryItem = item;
    renderLibraryResults();
    if (ui.targetTitle) ui.targetTitle.textContent = item.name || item.id;
    if (ui.targetMeta) ui.targetMeta.textContent = item.id + ' · 正在读取公开接口…';
    if (ui.targetInterfaces) ui.targetInterfaces.innerHTML = '<div class="behaviorEmptyState">正在读取…</div>';
    try {
      var prefab = await loadLibraryPrefab(item);
      var api = extractPublicApi(prefab || {});
      renderTargetInterfaces(item, api);
    } catch (err) {
      if (ui.targetMeta) ui.targetMeta.textContent = item.id + ' · 读取失败';
      if (ui.targetInterfaces) { ui.targetInterfaces.innerHTML = ''; var empty = document.createElement('div'); empty.className = 'behaviorEmptyState'; empty.textContent = '无法读取素材：' + String(err && err.message || err); ui.targetInterfaces.appendChild(empty); }
    }
  }

  function makeCommandSnippet(prefabId, command) {
    var args = String(command && command.args || '').trim();
    return 'world:findByPrefab(' + JSON.stringify(String(prefabId || 'prefab_id')) + '):' + String(command && command.name || 'command') + '(' + args + ')';
  }

  function renderTargetInterfaces(item, api) {
    if (!ui.targetInterfaces) return;
    ui.targetInterfaces.innerHTML = '';
    var commands = api && api.commands || [];
    var events = api && api.events || [];
    if (ui.targetMeta) ui.targetMeta.textContent = item.id + ' · Commands ' + commands.length + ' · Events ' + events.length;
    commands.forEach(function (command) {
      var snippet = makeCommandSnippet(item.id, command);
      var button = document.createElement('button'); button.type = 'button'; button.className = 'behaviorInterfaceInsert'; button.title = '点击插入调用代码';
      var code = document.createElement('code'); code.textContent = command.name + '(' + (command.args || '') + ')';
      var tag = document.createElement('small'); tag.textContent = '插入';
      button.appendChild(code); button.appendChild(tag);
      button.addEventListener('click', function () { insertText(snippet); });
      ui.targetInterfaces.appendChild(button);
    });
    events.forEach(function (event) {
      var button = document.createElement('button'); button.type = 'button'; button.className = 'behaviorInterfaceInsert'; button.title = '点击插入事件说明';
      var code = document.createElement('code'); code.textContent = 'event ' + event.name + '(' + (event.args || '') + ')';
      var tag = document.createElement('small'); tag.textContent = '事件';
      button.appendChild(code); button.appendChild(tag);
      button.addEventListener('click', function () { insertText('-- ' + item.id + ' emits ' + event.name + '(' + (event.args || '') + ')'); });
      ui.targetInterfaces.appendChild(button);
    });
    if (!commands.length && !events.length) {
      var empty = document.createElement('div'); empty.className = 'behaviorEmptyState';
      empty.textContent = '这个 Prefab 还没有在 Behavior 中暴露公开接口。'; ui.targetInterfaces.appendChild(empty);
    }
  }

  function renderGameApi() {
    if (!ui.gameApiList) return;
    ui.gameApiList.innerHTML = '';
    GAME_API.forEach(function (entry) {
      var button = document.createElement('button'); button.type = 'button'; button.className = 'behaviorInterfaceInsert'; button.title = entry.label;
      var code = document.createElement('code'); code.textContent = entry.signature;
      var tag = document.createElement('small'); tag.textContent = entry.kind;
      button.appendChild(code); button.appendChild(tag);
      button.addEventListener('click', function () { insertText(entry.snippet); });
      ui.gameApiList.appendChild(button);
    });
  }

  function buildCompletionItems() {
    var items = GAME_API.map(function (entry) { return { label: entry.signature, snippet: entry.snippet, kind: entry.kind }; });
    if (selectedLibraryItem && ui.targetInterfaces) {
      Array.from(ui.targetInterfaces.querySelectorAll('.behaviorInterfaceInsert code')).forEach(function (node) {
        var text = node.textContent || '';
        if (text.indexOf('event ') === 0) return;
        var commandName = text.split('(')[0];
        items.push({ label: selectedLibraryItem.id + ' · ' + text, snippet: 'world:findByPrefab(' + JSON.stringify(selectedLibraryItem.id) + '):' + commandName + '()', kind: 'prefab' });
      });
    }
    return items;
  }

  function showAutocomplete() {
    if (!ui.autocomplete || !ui.script) return;
    completionItems = buildCompletionItems(); completionIndex = 0;
    ui.autocomplete.innerHTML = '';
    completionItems.forEach(function (item, index) {
      var button = document.createElement('button'); button.type = 'button'; button.className = 'behaviorCompletionItem' + (index === 0 ? ' isActive' : '');
      var kind = document.createElement('span'); kind.className = 'kind'; kind.textContent = item.kind === 'prefab' ? 'P' : item.kind.charAt(0).toUpperCase();
      var label = document.createElement('strong'); label.textContent = item.label;
      var hint = document.createElement('small'); hint.textContent = 'Enter';
      button.appendChild(kind); button.appendChild(label); button.appendChild(hint);
      button.addEventListener('mousedown', function (e) { e.preventDefault(); insertText(item.snippet); hideAutocomplete(); });
      ui.autocomplete.appendChild(button);
    });
    ui.autocomplete.hidden = !completionItems.length;
  }

  function hideAutocomplete() { if (ui.autocomplete) ui.autocomplete.hidden = true; }

  function moveAutocomplete(delta) {
    if (!completionItems.length || !ui.autocomplete || ui.autocomplete.hidden) return false;
    completionIndex = (completionIndex + delta + completionItems.length) % completionItems.length;
    Array.from(ui.autocomplete.querySelectorAll('.behaviorCompletionItem')).forEach(function (node, index) { node.classList.toggle('isActive', index === completionIndex); });
    return true;
  }

  function acceptAutocomplete() {
    if (!completionItems.length || !ui.autocomplete || ui.autocomplete.hidden) return false;
    insertText(completionItems[completionIndex].snippet); hideAutocomplete(); return true;
  }

  function bindUi() {
    if (ui.addCommand) ui.addCommand.addEventListener('click', function () { addApi('command'); });
    if (ui.addEvent) ui.addEvent.addEventListener('click', function () { addApi('event'); });
    if (ui.capabilities) ui.capabilities.addEventListener('input', function () { syncBehavior(false); updateSaveSummary(); });
    if (ui.script) {
      ui.script.addEventListener('input', function () { updateLineNumbers(); updateCursorStatus(); syncBehavior(false); hideAutocomplete(); });
      ui.script.addEventListener('click', updateCursorStatus); ui.script.addEventListener('keyup', updateCursorStatus);
      ui.script.addEventListener('scroll', function () { if (ui.lineNumbers) ui.lineNumbers.scrollTop = ui.script.scrollTop; });
      ui.script.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.code === 'Space') { e.preventDefault(); showAutocomplete(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); flushBehavior(); return; }
        if (!ui.autocomplete.hidden && e.key === 'ArrowDown') { e.preventDefault(); moveAutocomplete(1); return; }
        if (!ui.autocomplete.hidden && e.key === 'ArrowUp') { e.preventDefault(); moveAutocomplete(-1); return; }
        if (!ui.autocomplete.hidden && (e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); acceptAutocomplete(); return; }
        if (!ui.autocomplete.hidden && e.key === 'Escape') { e.preventDefault(); hideAutocomplete(); return; }
        if (e.key === 'Tab') {
          e.preventDefault();
          var start = ui.script.selectionStart || 0, end = ui.script.selectionEnd || start, value = ui.script.value;
          ui.script.value = value.slice(0, start) + '  ' + value.slice(end); ui.script.setSelectionRange(start + 2, start + 2);
          updateLineNumbers(); syncBehavior(false);
        }
      });
    }
    if (ui.formatTemplate) ui.formatTemplate.addEventListener('click', insertTemplate);
    if (ui.toggleStateTemplate) ui.toggleStateTemplate.addEventListener('click', insertStateToggleTemplate);
    if (ui.saveDraft) ui.saveDraft.addEventListener('click', flushBehavior);
    if (ui.refreshLibrary) ui.refreshLibrary.addEventListener('click', refreshLibrary);
    if (ui.librarySearch) ui.librarySearch.addEventListener('input', renderLibraryResults);
    global.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && document.body.dataset.editorStep === 'behavior') {
        e.preventDefault(); if (ui.librarySearch) { ui.librarySearch.focus(); ui.librarySearch.select(); }
      }
    });
    global.addEventListener('unified-asset-editor:source-changed', function () { loadFromPrefab(); });
    global.addEventListener('hzh-emergent-asset-library:changed', function () { if (document.body.dataset.editorStep === 'behavior') refreshLibrary(); });
    global.addEventListener('unified-asset-editor:step-changed', function (e) {
      if (e.detail && e.detail.step === 'behavior') { loadFromPrefab(); if (!libraryItems.length) refreshLibrary(); }
    });
  }

  function installApi() {
    var api = {
      version: VERSION,
      getBehavior: function () { collectBehaviorFromUi(); return safeClone(behavior); },
      setBehavior: function (value) { behavior = normalizeBehavior(value); renderBehavior(); return safeClone(behavior); },
      refreshLibrary: refreshLibrary,
      insertText: insertText,
      makeCommandSnippet: makeCommandSnippet,
      insertStateToggleTemplate: insertStateToggleTemplate
    };
    global.__HZH_BEHAVIOR_EDITOR__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') global.__APP_NAMESPACE.bind('presentation.behaviorEditor', api, { owner: 'src/presentation/editor/behavior-editor.js', phase: 'asset-editor-behavior-v1' });
  }

  function initialize() {
    if (!ui.workspace || !ui.script) return;
    editorApi = getEditorApi();
    loadFromPrefab(); bindUi(); renderGameApi(); installApi();
    if (editorApi && typeof editorApi.registerBeforeExportHook === 'function') editorApi.registerBeforeExportHook(function () { flushBehavior(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true }); else initialize();
})(typeof window !== 'undefined' ? window : globalThis);
