// lighting-state.js
// Step-01: 从 lighting.js 中迁出灯光状态定义，保留全局调用兼容。

var LIGHTING_STATE_OWNER = 'src/core/lighting/lighting-state.js';

var LIGHT_TYPE_LABELS = {
  point: '点光',
  directional: '方向',
  spot: '聚光',
  area: '面积',
};

function normalizeLight(light) {
  light.type = light.type || 'point';
  if (light.x == null) light.x = 5;
  if (light.y == null) light.y = 3;
  if (light.z == null) light.z = 3;
  if (light.radius == null) light.radius = 240;
  if (light.intensity == null) light.intensity = 1;
  if (!light.color) light.color = '#ffe59b';
  if (light.angle == null) light.angle = 45;
  if (light.pitch == null) light.pitch = 55;
  if (light.spread == null) light.spread = 34;
  if (light.softness == null) light.softness = 0.45;
  if (light.size == null) light.size = 1.2;
  return light;
}

function makeLightingPreset(name) {
  if (name === 'warmHome') {
    return {
      ambient: 0.18,
      lights: [
        normalizeLight({ id: 1, type: 'point', name: '主暖灯', x: 5.5, y: 3.4, z: 3.8, radius: 300, intensity: 1.12, color: '#ffd792' }),
        normalizeLight({ id: 2, type: 'area', name: '窗边柔光', x: 2.0, y: 1.1, z: 3.1, radius: 260, intensity: 0.52, color: '#fff0d6', size: 1.8, softness: 0.72 }),
        normalizeLight({ id: 3, type: 'spot', name: '床头射灯', x: 8.2, y: 2.0, z: 3.0, radius: 220, intensity: 0.72, color: '#ffc07a', angle: 125, pitch: 68, spread: 28, softness: 0.38 }),
      ],
    };
  }
  if (name === 'coolShowroom') {
    return {
      ambient: 0.12,
      lights: [
        normalizeLight({ id: 1, type: 'directional', name: '冷色顶光', x: 3.0, y: 1.0, z: 4.2, radius: 620, intensity: 0.82, color: '#dff3ff', angle: -30, pitch: 63 }),
        normalizeLight({ id: 2, type: 'spot', name: '轨道射灯 A', x: 4.2, y: 2.0, z: 4.0, radius: 260, intensity: 0.92, color: '#f2fbff', angle: 45, pitch: 74, spread: 22, softness: 0.22 }),
        normalizeLight({ id: 3, type: 'spot', name: '轨道射灯 B', x: 7.8, y: 4.0, z: 4.0, radius: 250, intensity: 0.86, color: '#d9ebff', angle: 20, pitch: 72, spread: 24, softness: 0.22 }),
        normalizeLight({ id: 4, type: 'area', name: '发光面板', x: 9.0, y: 1.5, z: 3.3, radius: 220, intensity: 0.46, color: '#c8e6ff', size: 1.6, softness: 0.82 }),
      ],
    };
  }
  if (name === 'moonNight') {
    return {
      ambient: 0.06,
      lights: [
        normalizeLight({ id: 1, type: 'directional', name: '月光', x: 1.2, y: 0.9, z: 4.2, radius: 640, intensity: 0.72, color: '#a8d7ff', angle: -145, pitch: 42 }),
        normalizeLight({ id: 2, type: 'point', name: '夜灯', x: 7.9, y: 2.2, z: 2.4, radius: 170, intensity: 0.68, color: '#ffb36a' }),
        normalizeLight({ id: 3, type: 'area', name: '窗缝补光', x: 1.8, y: 0.9, z: 2.8, radius: 180, intensity: 0.22, color: '#d8efff', size: 1.2, softness: 0.9 }),
      ],
    };
  }
  return {
    ambient: 0.22,
    lights: [
      normalizeLight({ id: 1, type: 'point', name: '主灯', x: 5.5, y: 3.4, z: 3.7, radius: 310, intensity: 1.1, color: '#ffe59b' }),
      normalizeLight({ id: 2, type: 'point', name: '角落灯', x: 8.4, y: 2.4, z: 2.8, radius: 210, intensity: 0.58, color: '#a9d8ff' }),
      normalizeLight({ id: 3, type: 'directional', name: '天光', x: 2.0, y: 0.7, z: 4.2, radius: 620, intensity: 0.36, color: '#e7f3ff', angle: -60, pitch: 60 }),
      normalizeLight({ id: 4, type: 'spot', name: '射灯', x: 6.2, y: 5.2, z: 3.8, radius: 235, intensity: 0.72, color: '#fff4d2', angle: -35, pitch: 72, spread: 24, softness: 0.18 }),
      normalizeLight({ id: 5, type: 'area', name: '面板灯', x: 2.4, y: 1.4, z: 3.2, radius: 240, intensity: 0.42, color: '#f8f8ff', size: 1.7, softness: 0.84 }),
    ],
  };
}

function applyLightingPreset(name) {
  var preset = makeLightingPreset(name);
  settings.ambient = preset.ambient;
  lights.splice(0, lights.length, ...preset.lights.map(function (l) { return normalizeLight({ ...l }); }));
  nextLightId = lights.reduce(function (m, l) { return Math.max(m, l.id || 0); }, 0) + 1;
  activeLightId = (lights[0] && lights[0].id) || 1;
  syncLightUI();
  pushLog('lighting-preset: ' + name);
}

var nextLightId = 6;
var lights = makeLightingPreset('allOn').lights.map(function (l) { return normalizeLight({ ...l }); });
var activeLightId = lights[0].id;
var SHADOW_DISTANCE_FADE_DEFAULT_RATE = 0.35;
var SHADOW_DISTANCE_FADE_DEFAULT_MIN = 0.18;
var SHADOW_EDGE_FADE_DEFAULT_PX = 6;
var lightState = {
  enabled: true,
  showAxes: true,
  showShadows: true,
  showGlow: true,
  highContrastShadow: false,
  shadowDebugColor: '#ff2a6d',
  shadowAlpha: 0.24,
  shadowOpacityScale: 1,
  shadowDistanceFadeEnabled: false,
  shadowDistanceFadeRate: SHADOW_DISTANCE_FADE_DEFAULT_RATE,
  shadowDistanceFadeMin: SHADOW_DISTANCE_FADE_DEFAULT_MIN,
  shadowEdgeFadeEnabled: false,
  shadowEdgeFadePx: SHADOW_EDGE_FADE_DEFAULT_PX,
  dragAxis: null,
  hoverAxis: null,
  dragStartMouse: null,
  dragStartLight: null,
};

function activeLight() {
  return lights.find(function (l) { return l.id === activeLightId; }) || lights[0];
}

var __emptyLightingRenderList = [];

function isLightingSystemEnabled() {
  return !!(lightState && lightState.enabled !== false);
}

function getLightingRenderLights() {
  var renderLights = isLightingSystemEnabled() ? lights : __emptyLightingRenderList;
  try {
    var cullingApi = typeof window !== 'undefined' ? window.__MAIN_CAMERA_CULLING_API__ : null;
    if (cullingApi && typeof cullingApi.getScope === 'function' && typeof cullingApi.filterLights === 'function') {
      var rotation = 0;
      try {
        var controller = window.App && window.App.controllers ? window.App.controllers.main || null : null;
        if (controller && typeof controller.getMainEditorVisualRotation === 'function') rotation = Number(controller.getMainEditorVisualRotation('state.lightingState')) || 0;
      } catch (_) {}
      var scope = cullingApi.getScope(rotation);
      return cullingApi.filterLights(renderLights, scope);
    }
  } catch (_) {}
  return renderLights;
}

function shouldUseFastShadowSampling() {
  return !!(mouse.draggingView || lightState.dragAxis || player.moving || editor.mode === 'drag');
}

function shouldUseMediumAreaSampling() {
  return lights.length >= 4 && !shouldUseFastShadowSampling();
}

function serializeLightForLayer(light) {
  return {
    id: light.id,
    type: light.type,
    x: sigNum(light.x),
    y: sigNum(light.y),
    z: sigNum(light.z),
    radius: sigNum(light.radius),
    intensity: sigNum(light.intensity),
    color: light.color,
    angle: sigNum(light.angle),
    pitch: sigNum(light.pitch),
    spread: sigNum(light.spread),
    softness: sigNum(light.softness),
    size: sigNum(light.size),
  };
}

var LIGHTING_STATE_API = {
  owner: LIGHTING_STATE_OWNER,
  LIGHT_TYPE_LABELS: LIGHT_TYPE_LABELS,
  normalizeLight: normalizeLight,
  makeLightingPreset: makeLightingPreset,
  applyLightingPreset: applyLightingPreset,
  getLights: function () { return lights; },
  getLightState: function () { return lightState; },
  getActiveLightId: function () { return activeLightId; },
  activeLight: activeLight,
  isLightingSystemEnabled: isLightingSystemEnabled,
  getLightingRenderLights: getLightingRenderLights,
  shouldUseFastShadowSampling: shouldUseFastShadowSampling,
  shouldUseMediumAreaSampling: shouldUseMediumAreaSampling,
  serializeLightForLayer: serializeLightForLayer,
};
if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
  window.__APP_NAMESPACE.bind('state.lightingState', LIGHTING_STATE_API, { owner: LIGHTING_STATE_OWNER, phase: 'P2-A' });
}
