(function (global) {
  if (!global) return;

  var OWNER = 'src/application/controllers/controller-registry.js';
  var PHASE = 'P11b-1-CONTROLLER-REGISTRY';
  var CONTROLLER_KEYS = ['main', 'scene', 'assetLibrary', 'placement', 'editorHandoff'];

  function asObject(value) {
    return value && typeof value === 'object' ? value : {};
  }

  function getActionNames(actions) {
    return Object.keys(asObject(actions)).sort();
  }

  function getControllerFunctionSummary(actionGroups) {
    var groups = asObject(actionGroups);
    var summary = {};
    for (var i = 0; i < CONTROLLER_KEYS.length; i += 1) {
      var key = CONTROLLER_KEYS[i];
      summary[key] = getActionNames(groups[key]).concat(['dispatch']);
    }
    summary.root = ['dispatch'];
    return summary;
  }

  function createDispatchForActions(actions, invokeControllerAction) {
    var actionMap = asObject(actions);
    return function dispatchControllerAction(action, payload) {
      if (typeof invokeControllerAction === 'function') {
        return invokeControllerAction(actionMap, action, payload);
      }
      return null;
    };
  }

  function createControllerRoot(options) {
    var opts = asObject(options);
    var groups = asObject(opts.actionGroups);
    var invokeControllerAction = opts.invokeControllerAction;
    var root = {};

    for (var i = 0; i < CONTROLLER_KEYS.length; i += 1) {
      var key = CONTROLLER_KEYS[i];
      var actions = asObject(groups[key]);
      root[key] = Object.assign({}, actions, {
        dispatch: createDispatchForActions(actions, invokeControllerAction)
      });
    }

    root.dispatch = typeof opts.dispatchControllerCommand === 'function'
      ? opts.dispatchControllerCommand
      : function noopControllerDispatch() { return null; };
    return root;
  }

  function bindControllerRoot(options) {
    var opts = asObject(options);
    var ns = opts.ns || null;
    var root = opts.controllerRoot || createControllerRoot(opts);
    var owner = String(opts.owner || OWNER);
    var phase = String(opts.phase || PHASE);

    if (ns && typeof ns.bind === 'function') {
      try { ns.bind('controllers.main', root.main, { owner: owner, legacy: [], phase: phase }); } catch (_) {}
      try { ns.bind('controllers.scene', root.scene, { owner: owner, legacy: [], phase: phase }); } catch (_) {}
      try { ns.bind('controllers.assetLibrary', root.assetLibrary, { owner: owner, legacy: [], phase: phase }); } catch (_) {}
      try { ns.bind('controllers.placement', root.placement, { owner: owner, legacy: [], phase: phase }); } catch (_) {}
      try { ns.bind('controllers.editorHandoff', root.editorHandoff, { owner: owner, legacy: [], phase: phase }); } catch (_) {}
      try { ns.bind('controllers.dispatch', root.dispatch, { owner: owner, legacy: [], phase: phase }); } catch (_) {}
    }
    return root;
  }

  function emitRegistryCoverage(options) {
    var opts = asObject(options);
    var emitP7 = opts.emitP7;
    if (typeof emitP7 !== 'function') return null;
    var actionGroups = asObject(opts.actionGroups);
    var owner = String(opts.owner || OWNER);
    var phase = String(opts.phase || PHASE);
    var roots = [
      'controllers.main',
      'controllers.scene',
      'controllers.assetLibrary',
      'controllers.placement',
      'controllers.editorHandoff',
      'controllers.dispatch'
    ];

    emitP7('BOOT', 'controller-entrypoints-ready', {
      phase: phase,
      owner: owner,
      roots: roots,
      functions: getControllerFunctionSummary(actionGroups)
    });
    return emitP7('SUMMARY', 'controller-entrypoint-coverage', {
      phase: phase,
      owner: owner,
      wiredInto: [
        'src/presentation/ui/ui.js:mode/prefab/scene/editor/rescan buttons',
        'src/presentation/shell/app.js:editor-return startup/focus/visibility',
        'src/presentation/ui/ui-habbo-library.js:open/refresh/type/category/search/page/place actions'
      ],
      notes: [
        'P11b-1 moves controller entrypoint registration into controller-registry.js while app-controllers.js keeps concrete application action orchestration.',
        'Controller roots are now composed and bound through a dedicated owner so app-controllers.js no longer owns registry wiring.',
        'UI handlers and editor-return hooks continue to prefer App.controllers.*.dispatch(...) before falling back to lower-level services or globals.'
      ]
    });
  }

  function registerControllers(options) {
    var opts = asObject(options);
    var root = bindControllerRoot(opts);
    emitRegistryCoverage(Object.assign({}, opts, { controllerRoot: root }));
    return root;
  }

  global.__APP_CONTROLLER_REGISTRY__ = {
    owner: OWNER,
    phase: PHASE,
    createControllerRoot: createControllerRoot,
    bindControllerRoot: bindControllerRoot,
    emitRegistryCoverage: emitRegistryCoverage,
    registerControllers: registerControllers,
    getControllerFunctionSummary: getControllerFunctionSummary
  };

  try {
    var ns = global.__APP_NAMESPACE || null;
    if (ns && typeof ns.bind === 'function') {
      ns.bind('controllers.registry', global.__APP_CONTROLLER_REGISTRY__, { owner: OWNER, legacy: [], phase: PHASE });
      ns.bind('application.controllerRegistry', global.__APP_CONTROLLER_REGISTRY__, { owner: OWNER, legacy: [], phase: PHASE });
    }
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
