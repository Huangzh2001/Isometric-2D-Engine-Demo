// P11f-1b: Terrain panel refresh/form presentation owner.
// Owns terrain form read/apply, algorithm panel visibility, and terrain summary refresh.
(function installUiTerrainPanelRefresh(global) {
  'use strict';

  var OWNER = 'src/presentation/ui/ui-terrain-panel-refresh.js';

  function depsOrEmpty(deps) { return deps || {}; }
  function getUi(deps) { return deps && typeof deps.getUi === 'function' ? (deps.getUi() || {}) : {}; }
  function getMainController(deps) {
    try { return deps && typeof deps.getUiMainController === 'function' ? deps.getUiMainController() : null; } catch (_) { return null; }
  }
  function dispatchMain(deps, command, args) {
    try {
      if (deps && typeof deps.uiDispatchControllerCommand === 'function') return deps.uiDispatchControllerCommand('main', command, args || []);
    } catch (_) {}
    return null;
  }
  function callOptional(deps, name, args) {
    try {
      var fn = deps && deps[name];
      if (typeof fn === 'function') return fn.apply(null, args || []);
    } catch (_) {}
    return null;
  }

  function uiNormalizeTerrainAlgorithmValue(value) {
    var raw = String(value == null ? '' : value).trim();
    if (!raw) return 'profile_fbm';
    if (raw === 'random' || raw === 'rand') return 'random_height';
    if (raw === 'sin') return 'sin_wave';
    if (raw === 'fbm' || raw === 'simple_fbm' || raw === 'simple-fbm' || raw === 'noise') return 'perlin_octaves';
    if (raw === 'profile_perlin' || raw === 'profile-fbm' || raw === 'profile_fbm' || raw === 'profile' || raw === 'height_profile') return 'profile_fbm';
    if (raw === 'multiple_perlin') return 'multi_perlin';
    if (raw === 'single_perlin') return 'perlin';
    if (['random_height', 'sin_wave', 'perlin', 'perlin_octaves', 'multi_perlin', 'profile_fbm'].indexOf(raw) >= 0) return raw;
    return 'profile_fbm';
  }

  function uiTerrainNumberSetting(settings, key, fallback) {
    if (!settings || !Object.prototype.hasOwnProperty.call(settings, key)) return fallback;
    var value = Number(settings[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  function uiSetTerrainInputValue(el, value) {
    if (!el) return;
    el.value = String(value);
  }

  function uiSetTerrainSelectValue(el, value) {
    if (!el) return;
    el.value = String(value);
  }

  function uiSetTerrainAlgorithmPanelVisible(el, visible) {
    if (!el) return;
    try { el.hidden = !visible; } catch (_) {}
    el.style.display = visible ? '' : 'none';
  }

  function uiUpdateTerrainAlgorithmPanel(source, deps) {
    deps = depsOrEmpty(deps);
    var ui = getUi(deps);
    var algorithm = uiNormalizeTerrainAlgorithmValue(ui.terrainAlgorithm && ui.terrainAlgorithm.value || 'profile_fbm');

    uiSetTerrainAlgorithmPanelVisible(ui.terrainRandomParamsPanel, algorithm === 'random_height');
    uiSetTerrainAlgorithmPanelVisible(ui.terrainSinParamsPanel, algorithm === 'sin_wave');
    uiSetTerrainAlgorithmPanelVisible(ui.terrainPerlinParamsPanel, algorithm === 'perlin');
    uiSetTerrainAlgorithmPanelVisible(ui.terrainOctaveParamsPanel, algorithm === 'perlin_octaves');
    uiSetTerrainAlgorithmPanelVisible(ui.terrainMultiPerlinParamsPanel, algorithm === 'multi_perlin');
    uiSetTerrainAlgorithmPanelVisible(ui.terrainProfileParamsPanel, algorithm === 'profile_fbm');

    if (ui.terrainAlgorithmHint) {
      if (algorithm === 'random_height') {
        ui.terrainAlgorithmHint.textContent = 'Random：每个格子独立随机取高度，变化最突兀，主要用于对照测试。';
      } else if (algorithm === 'sin_wave') {
        ui.terrainAlgorithmHint.textContent = 'Sin：用正弦函数生成平滑且周期性的高低起伏，参数控制波长、相位和混合方式。';
      } else if (algorithm === 'perlin') {
        ui.terrainAlgorithmHint.textContent = 'Perlin(x,z)：单层平滑噪声，Scale 控制起伏尺度，Offset 控制采样平移。';
      } else if (algorithm === 'perlin_octaves') {
        ui.terrainAlgorithmHint.textContent = 'Perlin + Octaves：多八度 fBm 噪声，Octaves / Persistence / Lacunarity 控制细节层级。';
      } else if (algorithm === 'multi_perlin') {
        ui.terrainAlgorithmHint.textContent = 'Multiple Perlin：多个不同尺度、权重、偏移和 seedOffset 的 Perlin 函数叠加。';
      } else {
        ui.terrainAlgorithmHint.textContent = 'Perlin + Height Profile：macro noise 选择基础海拔档位，detail noise 叠加局部起伏，可生成突兀山体、悬崖和台地。';
      }
    }
    return { algorithm: algorithm, source: String(source || 'terrain-panel:algorithm-panel') };
  }

  function uiHandleTerrainAlgorithmChange(source, deps) {
    deps = depsOrEmpty(deps);
    var panelState = uiUpdateTerrainAlgorithmPanel(source || 'terrain-panel:algorithm-change', deps);
    var payload = { terrainAlgorithm: panelState.algorithm };
    var dispatched = dispatchMain(deps, 'setMainEditorTerrainSettings', [payload, source || 'terrain-panel:algorithm-change']);
    var controller = getMainController(deps);
    return dispatched || (controller && typeof controller.setMainEditorTerrainSettings === 'function' ? controller.setMainEditorTerrainSettings(payload, source || 'terrain-panel:algorithm-change') : panelState);
  }

  function uiHandleTerrainParamGroupToggle(button, source) {
    if (!button) return { ok: false, reason: 'missing-button' };
    var group = button.closest ? button.closest('.terrainParamGroup') : null;
    if (!group) return { ok: false, reason: 'missing-param-group' };
    var nextCollapsed = !group.classList.contains('collapsed');
    group.classList.toggle('collapsed', nextCollapsed);
    try { button.setAttribute('aria-expanded', nextCollapsed ? 'false' : 'true'); } catch (_) {}
    return {
      ok: true,
      collapsed: nextCollapsed,
      source: String(source || 'terrain-panel:param-group-toggle')
    };
  }

  function uiReadTerrainProfileRows(deps) {
    var ui = getUi(depsOrEmpty(deps));
    return [0, 1, 2, 3].map(function (idx) {
      var startEl = ui['terrainProfile' + idx + 'Start'];
      var endEl = ui['terrainProfile' + idx + 'End'];
      var baseEl = ui['terrainProfile' + idx + 'Base'];
      return {
        start: Number(startEl && startEl.value || 0),
        end: Number(endEl && endEl.value || 0),
        baseHeight: Number(baseEl && baseEl.value || 0)
      };
    });
  }

  function uiReadMainTerrainFormValues(deps) {
    deps = depsOrEmpty(deps);
    var ui = getUi(deps);
    var octaveScale = Number(ui.terrainOctaveScale && ui.terrainOctaveScale.value || 0);
    var octaveCount = Number(ui.terrainOctaves && ui.terrainOctaves.value || 0);
    var octavePersistence = Number(ui.terrainPersistence && ui.terrainPersistence.value || 0);
    var octaveLacunarity = Number(ui.terrainLacunarity && ui.terrainLacunarity.value || 0);
    var detailScale = Number(ui.terrainDetailScale && ui.terrainDetailScale.value || 0);
    var detailOctaves = Number(ui.terrainDetailOctaves && ui.terrainDetailOctaves.value || 0);
    var detailPersistence = Number(ui.terrainDetailPersistence && ui.terrainDetailPersistence.value || 0);
    var detailLacunarity = Number(ui.terrainDetailLacunarity && ui.terrainDetailLacunarity.value || 0);

    return {
      seed: ui.terrainSeed ? String(ui.terrainSeed.value || '').trim() : '1337',
      width: Number(ui.terrainWidth && ui.terrainWidth.value || 0),
      height: Number(ui.terrainHeight && ui.terrainHeight.value || 0),
      minHeight: Number(ui.terrainMinHeight && ui.terrainMinHeight.value || 0),
      maxHeight: Number(ui.terrainMaxHeight && ui.terrainMaxHeight.value || 0),
      waterLevel: Number(ui.terrainWaterLevel && ui.terrainWaterLevel.value || 0),
      baseHeightOffset: Number(ui.terrainBaseHeightOffset && ui.terrainBaseHeightOffset.value || 0),
      terrainAlgorithm: uiNormalizeTerrainAlgorithmValue(ui.terrainAlgorithm && ui.terrainAlgorithm.value || 'profile_fbm'),
      sinScaleX: Number(ui.terrainSinScaleX && ui.terrainSinScaleX.value || 0),
      sinScaleZ: Number(ui.terrainSinScaleZ && ui.terrainSinScaleZ.value || 0),
      sinScaleY: Number(ui.terrainSinScaleZ && ui.terrainSinScaleZ.value || 0),
      sinPhaseX: Number(ui.terrainSinPhaseX && ui.terrainSinPhaseX.value || 0),
      sinPhaseZ: Number(ui.terrainSinPhaseZ && ui.terrainSinPhaseZ.value || 0),
      sinPhaseY: Number(ui.terrainSinPhaseZ && ui.terrainSinPhaseZ.value || 0),
      sinMixMode: String(ui.terrainSinMixMode && ui.terrainSinMixMode.value || 'add'),
      perlinScale: Number(ui.terrainPerlinScale && ui.terrainPerlinScale.value || 0),
      perlinOffsetX: Number(ui.terrainPerlinOffsetX && ui.terrainPerlinOffsetX.value || 0),
      perlinOffsetZ: Number(ui.terrainPerlinOffsetZ && ui.terrainPerlinOffsetZ.value || 0),
      octaveScale: octaveScale,
      octaves: octaveCount,
      persistence: octavePersistence,
      lacunarity: octaveLacunarity,
      octaveOffsetX: Number(ui.terrainOctaveOffsetX && ui.terrainOctaveOffsetX.value || 0),
      octaveOffsetZ: Number(ui.terrainOctaveOffsetZ && ui.terrainOctaveOffsetZ.value || 0),
      multiScale1: Number(ui.terrainMultiScale1 && ui.terrainMultiScale1.value || 0),
      multiWeight1: Number(ui.terrainMultiWeight1 && ui.terrainMultiWeight1.value || 0),
      multiOffsetX1: Number(ui.terrainMultiOffsetX1 && ui.terrainMultiOffsetX1.value || 0),
      multiOffsetZ1: Number(ui.terrainMultiOffsetZ1 && ui.terrainMultiOffsetZ1.value || 0),
      multiSeedOffset1: Number(ui.terrainMultiSeedOffset1 && ui.terrainMultiSeedOffset1.value || 0),
      multiScale2: Number(ui.terrainMultiScale2 && ui.terrainMultiScale2.value || 0),
      multiWeight2: Number(ui.terrainMultiWeight2 && ui.terrainMultiWeight2.value || 0),
      multiOffsetX2: Number(ui.terrainMultiOffsetX2 && ui.terrainMultiOffsetX2.value || 0),
      multiOffsetZ2: Number(ui.terrainMultiOffsetZ2 && ui.terrainMultiOffsetZ2.value || 0),
      multiSeedOffset2: Number(ui.terrainMultiSeedOffset2 && ui.terrainMultiSeedOffset2.value || 0),
      multiScale3: Number(ui.terrainMultiScale3 && ui.terrainMultiScale3.value || 0),
      multiWeight3: Number(ui.terrainMultiWeight3 && ui.terrainMultiWeight3.value || 0),
      multiOffsetX3: Number(ui.terrainMultiOffsetX3 && ui.terrainMultiOffsetX3.value || 0),
      multiOffsetZ3: Number(ui.terrainMultiOffsetZ3 && ui.terrainMultiOffsetZ3.value || 0),
      multiSeedOffset3: Number(ui.terrainMultiSeedOffset3 && ui.terrainMultiSeedOffset3.value || 0),
      macroScale: Number(ui.terrainMacroScale && ui.terrainMacroScale.value || 0),
      macroOctaves: Number(ui.terrainMacroOctaves && ui.terrainMacroOctaves.value || 0),
      macroPersistence: Number(ui.terrainMacroPersistence && ui.terrainMacroPersistence.value || 0),
      macroLacunarity: Number(ui.terrainMacroLacunarity && ui.terrainMacroLacunarity.value || 0),
      macroOffsetX: Number(ui.terrainMacroOffsetX && ui.terrainMacroOffsetX.value || 0),
      macroOffsetZ: Number(ui.terrainMacroOffsetZ && ui.terrainMacroOffsetZ.value || 0),
      detailScale: detailScale,
      detailOctaves: detailOctaves,
      detailPersistence: detailPersistence,
      detailLacunarity: detailLacunarity,
      detailStrength: Number(ui.terrainDetailStrength && ui.terrainDetailStrength.value || 0),
      detailOffsetX: Number(ui.terrainDetailOffsetX && ui.terrainDetailOffsetX.value || 0),
      detailOffsetZ: Number(ui.terrainDetailOffsetZ && ui.terrainDetailOffsetZ.value || 0),
      legacyOctaveScale: octaveScale,
      legacyOctaves: octaveCount,
      terrainDebugFaceColorsEnabled: !!(ui.terrainDebugFaceColorsEnabled && ui.terrainDebugFaceColorsEnabled.checked),
      terrainColorMode: (ui.terrainDebugFaceColorsEnabled && ui.terrainDebugFaceColorsEnabled.checked) ? 'debug-semantic' : 'natural',
      terrainBuildColorMode: String(ui.terrainBuildColorMode && ui.terrainBuildColorMode.value || 'natural'),
      terrainBuildLightingBypass: !!(ui.terrainBuildLightingBypass && ui.terrainBuildLightingBypass.checked),
      terrainDetailedProfilingEnabled: !!(ui.terrainDetailedProfilingEnabled && ui.terrainDetailedProfilingEnabled.checked),
      heightProfileConfig: uiReadTerrainProfileRows(deps)
    };
  }

  function uiGetMainTerrainSettings(source, deps) {
    deps = depsOrEmpty(deps);
    var dispatched = dispatchMain(deps, 'getMainEditorTerrainSettings', [source || 'terrain-panel:read']);
    if (dispatched) return dispatched;
    var controller = getMainController(deps);
    if (controller && typeof controller.getMainEditorTerrainSettings === 'function') return controller.getMainEditorTerrainSettings(source || 'terrain-panel:read');
    return null;
  }

  function uiApplyMainTerrainSettingsToForm(settings, deps) {
    deps = depsOrEmpty(deps);
    var ui = getUi(deps);
    if (!settings) return;
    uiSetTerrainInputValue(ui.terrainSeed, settings.seed != null ? settings.seed : '1337');
    uiSetTerrainInputValue(ui.terrainWidth, Math.max(1, Number(settings.width) || 1));
    uiSetTerrainInputValue(ui.terrainHeight, Math.max(1, Number(settings.height) || 1));
    uiSetTerrainInputValue(ui.terrainMinHeight, uiTerrainNumberSetting(settings, 'minHeight', -10));
    uiSetTerrainInputValue(ui.terrainMaxHeight, uiTerrainNumberSetting(settings, 'maxHeight', 25));
    uiSetTerrainInputValue(ui.terrainWaterLevel, uiTerrainNumberSetting(settings, 'waterLevel', 0));
    uiSetTerrainInputValue(ui.terrainBaseHeightOffset, uiTerrainNumberSetting(settings, 'baseHeightOffset', 0));
    uiSetTerrainSelectValue(ui.terrainAlgorithm, uiNormalizeTerrainAlgorithmValue(settings.terrainAlgorithm || 'profile_fbm'));
    uiUpdateTerrainAlgorithmPanel('terrain-panel:apply-settings', deps);
    uiSetTerrainInputValue(ui.terrainSinScaleX, uiTerrainNumberSetting(settings, 'sinScaleX', 8));
    uiSetTerrainInputValue(ui.terrainSinScaleZ, uiTerrainNumberSetting(settings, 'sinScaleZ', uiTerrainNumberSetting(settings, 'sinScaleY', 8)));
    uiSetTerrainInputValue(ui.terrainSinPhaseX, uiTerrainNumberSetting(settings, 'sinPhaseX', 0));
    uiSetTerrainInputValue(ui.terrainSinPhaseZ, uiTerrainNumberSetting(settings, 'sinPhaseZ', uiTerrainNumberSetting(settings, 'sinPhaseY', 0)));
    uiSetTerrainSelectValue(ui.terrainSinMixMode, String(settings.sinMixMode || 'add'));
    uiSetTerrainInputValue(ui.terrainPerlinScale, uiTerrainNumberSetting(settings, 'perlinScale', 16));
    uiSetTerrainInputValue(ui.terrainPerlinOffsetX, uiTerrainNumberSetting(settings, 'perlinOffsetX', 0));
    uiSetTerrainInputValue(ui.terrainPerlinOffsetZ, uiTerrainNumberSetting(settings, 'perlinOffsetZ', 0));
    uiSetTerrainInputValue(ui.terrainOctaveScale, uiTerrainNumberSetting(settings, 'octaveScale', uiTerrainNumberSetting(settings, 'detailScale', 16)));
    uiSetTerrainInputValue(ui.terrainOctaves, uiTerrainNumberSetting(settings, 'octaves', uiTerrainNumberSetting(settings, 'detailOctaves', 4)));
    uiSetTerrainInputValue(ui.terrainPersistence, uiTerrainNumberSetting(settings, 'persistence', 0.5));
    uiSetTerrainInputValue(ui.terrainLacunarity, uiTerrainNumberSetting(settings, 'lacunarity', 2));
    uiSetTerrainInputValue(ui.terrainOctaveOffsetX, uiTerrainNumberSetting(settings, 'octaveOffsetX', 0));
    uiSetTerrainInputValue(ui.terrainOctaveOffsetZ, uiTerrainNumberSetting(settings, 'octaveOffsetZ', 0));
    uiSetTerrainInputValue(ui.terrainMultiScale1, uiTerrainNumberSetting(settings, 'multiScale1', 16));
    uiSetTerrainInputValue(ui.terrainMultiWeight1, uiTerrainNumberSetting(settings, 'multiWeight1', 1));
    uiSetTerrainInputValue(ui.terrainMultiOffsetX1, uiTerrainNumberSetting(settings, 'multiOffsetX1', 0));
    uiSetTerrainInputValue(ui.terrainMultiOffsetZ1, uiTerrainNumberSetting(settings, 'multiOffsetZ1', 0));
    uiSetTerrainInputValue(ui.terrainMultiSeedOffset1, uiTerrainNumberSetting(settings, 'multiSeedOffset1', 101));
    uiSetTerrainInputValue(ui.terrainMultiScale2, uiTerrainNumberSetting(settings, 'multiScale2', 32));
    uiSetTerrainInputValue(ui.terrainMultiWeight2, uiTerrainNumberSetting(settings, 'multiWeight2', 0.55));
    uiSetTerrainInputValue(ui.terrainMultiOffsetX2, uiTerrainNumberSetting(settings, 'multiOffsetX2', 0));
    uiSetTerrainInputValue(ui.terrainMultiOffsetZ2, uiTerrainNumberSetting(settings, 'multiOffsetZ2', 0));
    uiSetTerrainInputValue(ui.terrainMultiSeedOffset2, uiTerrainNumberSetting(settings, 'multiSeedOffset2', 202));
    uiSetTerrainInputValue(ui.terrainMultiScale3, uiTerrainNumberSetting(settings, 'multiScale3', 48));
    uiSetTerrainInputValue(ui.terrainMultiWeight3, uiTerrainNumberSetting(settings, 'multiWeight3', 0.35));
    uiSetTerrainInputValue(ui.terrainMultiOffsetX3, uiTerrainNumberSetting(settings, 'multiOffsetX3', 0));
    uiSetTerrainInputValue(ui.terrainMultiOffsetZ3, uiTerrainNumberSetting(settings, 'multiOffsetZ3', 0));
    uiSetTerrainInputValue(ui.terrainMultiSeedOffset3, uiTerrainNumberSetting(settings, 'multiSeedOffset3', 303));
    uiSetTerrainInputValue(ui.terrainMacroScale, uiTerrainNumberSetting(settings, 'macroScale', 28));
    uiSetTerrainInputValue(ui.terrainMacroOctaves, uiTerrainNumberSetting(settings, 'macroOctaves', 3));
    uiSetTerrainInputValue(ui.terrainMacroPersistence, uiTerrainNumberSetting(settings, 'macroPersistence', 0.55));
    uiSetTerrainInputValue(ui.terrainMacroLacunarity, uiTerrainNumberSetting(settings, 'macroLacunarity', 2));
    uiSetTerrainInputValue(ui.terrainMacroOffsetX, uiTerrainNumberSetting(settings, 'macroOffsetX', 0));
    uiSetTerrainInputValue(ui.terrainMacroOffsetZ, uiTerrainNumberSetting(settings, 'macroOffsetZ', 0));
    uiSetTerrainInputValue(ui.terrainDetailScale, uiTerrainNumberSetting(settings, 'detailScale', 8));
    uiSetTerrainInputValue(ui.terrainDetailOctaves, uiTerrainNumberSetting(settings, 'detailOctaves', 4));
    uiSetTerrainInputValue(ui.terrainDetailPersistence, uiTerrainNumberSetting(settings, 'detailPersistence', 0.5));
    uiSetTerrainInputValue(ui.terrainDetailLacunarity, uiTerrainNumberSetting(settings, 'detailLacunarity', 2));
    uiSetTerrainInputValue(ui.terrainDetailStrength, uiTerrainNumberSetting(settings, 'detailStrength', 4));
    uiSetTerrainInputValue(ui.terrainDetailOffsetX, uiTerrainNumberSetting(settings, 'detailOffsetX', 0));
    uiSetTerrainInputValue(ui.terrainDetailOffsetZ, uiTerrainNumberSetting(settings, 'detailOffsetZ', 0));
    if (ui.terrainDebugFaceColorsEnabled) ui.terrainDebugFaceColorsEnabled.checked = settings.terrainDebugFaceColorsEnabled === true;
    if (ui.terrainBuildColorMode) ui.terrainBuildColorMode.value = String(settings.terrainBuildColorMode || 'natural');
    if (ui.terrainBuildLightingBypass) ui.terrainBuildLightingBypass.checked = settings.terrainBuildLightingBypass === true;
    if (ui.terrainDetailedProfilingEnabled) ui.terrainDetailedProfilingEnabled.checked = settings.terrainDetailedProfilingEnabled === true;
    var profile = Array.isArray(settings.heightProfileConfig) ? settings.heightProfileConfig : [];
    [0, 1, 2, 3].forEach(function (idx) {
      var defaults = [
        { start: 0, end: 0.25, baseHeight: -10 },
        { start: 0.25, end: 0.58, baseHeight: 5 },
        { start: 0.58, end: 0.60, baseHeight: 25 },
        { start: 0.60, end: 1.01, baseHeight: 25 }
      ];
      var segment = profile[idx] || defaults[idx];
      uiSetTerrainInputValue(ui['terrainProfile' + idx + 'Start'], Number(segment.start) || 0);
      uiSetTerrainInputValue(ui['terrainProfile' + idx + 'End'], Number(segment.end) || 0);
      uiSetTerrainInputValue(ui['terrainProfile' + idx + 'Base'], Number(segment.baseHeight) || 0);
    });
  }

  function uiRefreshMainTerrainPanel(source, deps) {
    deps = depsOrEmpty(deps);
    var ui = getUi(deps);
    var settings = uiGetMainTerrainSettings(source || 'terrain-panel:refresh', deps) || null;
    if (!settings) return null;
    uiApplyMainTerrainSettingsToForm(settings, deps);
    if (ui.terrainSummary) {
      var summary = settings.lastSummary || null;
      ui.terrainSummary.textContent = summary
        ? ('Terrain：algorithm=' + String(settings.terrainAlgorithm || 'profile_fbm') + ' · batch=' + String(summary.terrainBatchId || '-') + ' · cells=' + String(summary.generatedCellCount || 0) + ' · voxels=' + String(summary.generatedVoxelCount || 0) + (summary.appliedVoxelCount != null ? (' · applied=' + String(summary.appliedVoxelCount || 0)) : '') + ' · min/max=' + String(summary.minHeightObserved || 0) + '/' + String(summary.maxHeightObserved || 0) + ((settings.terrainDebugFaceColorsEnabled === true) ? ' · debug-colors=on' : '') + ' · buildColor=' + String(settings.terrainBuildColorMode || 'natural') + ' · lightingBypass=' + String(settings.terrainBuildLightingBypass === true) + ' · detailedLog=' + String(settings.terrainDetailedProfilingEnabled === true))
        : 'Terrain：尚未生成。';
    }
    if (ui.terrainDetails) {
      try { ui.terrainDetails.textContent = JSON.stringify(settings, null, 2); } catch (_) { ui.terrainDetails.textContent = String(settings); }
    }
    callOptional(deps, 'uiSyncTerrainMapColorMode', [source || 'terrain-panel:refresh']);
    if (ui.terrainMapWindow && ui.terrainMapWindow.hidden === false) callOptional(deps, 'uiRenderTerrainMapWindow', [(source || 'terrain-panel:refresh') + ':terrain-map']);
    return settings;
  }

  global.__UI_TERRAIN_PANEL_REFRESH__ = {
    OWNER: OWNER,
    uiNormalizeTerrainAlgorithmValue: uiNormalizeTerrainAlgorithmValue,
    uiTerrainNumberSetting: uiTerrainNumberSetting,
    uiSetTerrainInputValue: uiSetTerrainInputValue,
    uiSetTerrainSelectValue: uiSetTerrainSelectValue,
    uiSetTerrainAlgorithmPanelVisible: uiSetTerrainAlgorithmPanelVisible,
    uiUpdateTerrainAlgorithmPanel: uiUpdateTerrainAlgorithmPanel,
    uiHandleTerrainAlgorithmChange: uiHandleTerrainAlgorithmChange,
    uiHandleTerrainParamGroupToggle: uiHandleTerrainParamGroupToggle,
    uiReadTerrainProfileRows: uiReadTerrainProfileRows,
    uiReadMainTerrainFormValues: uiReadMainTerrainFormValues,
    uiGetMainTerrainSettings: uiGetMainTerrainSettings,
    uiApplyMainTerrainSettingsToForm: uiApplyMainTerrainSettingsToForm,
    uiRefreshMainTerrainPanel: uiRefreshMainTerrainPanel,
  };
})(typeof window !== 'undefined' ? window : globalThis);
