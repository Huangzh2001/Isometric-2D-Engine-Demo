// lighting module: extracted lighting state, UI bindings, and render entry wrappers.

var LIGHTING_MODULE_OWNER = 'src/lighting/lighting.js';

function lightingRoute(event, extra = '') {
  try {
    if (typeof logRoute === 'function') logRoute('lighting', event, extra);
    else if (typeof detailLog === 'function') detailLog(`[route][lighting] ${event}${extra ? ' ' + extra : ''}`);
  } catch (_err) {}
}

var LIGHT_TYPE_LABELS = {
point: '点光',
directional: '方向',
spot: '聚光',
area: '面积',
};

var LOCAL_SCENE_STORAGE_KEY = 'isometric-room-scene-v1';
var LOCAL_PREFAB_STORAGE_KEY = 'isometric-room-prefabs-v1';
var LOCAL_SCENE_CURRENT_FILE_KEY = 'isometric-room-scene-current-file-v1';
var SCENE_API_SAVE_URL = '/api/scenes/save';
var SCENE_API_LOAD_URL = '/api/scenes/load';
var SCENE_API_DEFAULT_URL = '/api/scenes/default';
var currentSceneServerFile = '';


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
lights.splice(0, lights.length, ...preset.lights.map(l => normalizeLight({ ...l })));
nextLightId = lights.reduce((m, l) => Math.max(m, l.id || 0), 0) + 1;
activeLightId = lights[0]?.id ?? 1;
syncLightUI();
pushLog(`lighting-preset: ${name}`);
}

var nextLightId = 6;
var lights = makeLightingPreset('allOn').lights.map(l => normalizeLight({ ...l }));
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
return lights.find(l => l.id === activeLightId) || lights[0];
}

var __emptyLightingRenderList = [];

function isLightingSystemEnabled() {
return !!(lightState && lightState.enabled !== false);
}

function getLightingRenderLights() {
return isLightingSystemEnabled() ? lights : __emptyLightingRenderList;
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



var __lightingUiBound = false;

function updateLightingTypeHint(light) {
if (!light) return;
var hints = {
  point: '点光源：像灯泡、床头灯，最适合做局部亮斑和明显衰减。',
  directional: '方向光：像太阳/月光，几乎不随距离衰减，更适合做全局主方向。',
  spot: '聚光灯：像射灯/手电筒；角度、俯仰和张角决定光束形状。',
  area: '面积光：用多个采样点近似柔和发光面，适合窗光、灯箱、发光面板。',
};
setElText(ui.lightTypeHint, hints[light.type] || '');
}

function bindLightNumberInput(el, key, formatter = null) {
  return safeListen(el, 'input', () => {
    const l = activeLight();
    if (!l) return;
    l[key] = Number(el.value);
    if (formatter) formatter();
    lightingRoute('input:' + key, 'value=' + String(l[key]));
    syncLightUI();
  }, `light-number:${key}`);
}

function bindLightingUi() {
if (__lightingUiBound) return true;
if (!ui || typeof safeListen !== 'function') return false;
__lightingUiBound = true;
lightingRoute('bind-ui:start');
safeListen(ui.lightingEnabled, 'change', () => {
  lightState.enabled = !!ui.lightingEnabled.checked;
  lightingRoute('input:lightingEnabled', 'value=' + String(lightState.enabled));
  syncLightUI();
  if (typeof invalidateShadowGeometryCache === 'function') invalidateShadowGeometryCache('lighting-enabled-toggle');
}, 'lighting-enabled');
safeListen(ui.lightName, 'input', () => {
  const l = activeLight();
  if (!l) return;
  l.name = ui.lightName.value || '未命名光源';
  lightingRoute('input:name', 'value=' + JSON.stringify(l.name));
  renderLightList();
}, 'light-name');
bindLightNumberInput(ui.lightXInput, 'x');
bindLightNumberInput(ui.lightYInput, 'y');
bindLightNumberInput(ui.lightZInput, 'z');
safeListen(ui.lightType, 'change', () => {
  const l = activeLight();
  if (!l) return;
  l.type = ui.lightType.value;
  normalizeLight(l);
  lightingRoute('input:type', 'value=' + JSON.stringify(l.type));
  syncLightUI();
}, 'light-type');
safeListen(ui.lightColor, 'input', () => {
  const l = activeLight();
  if (!l) return;
  l.color = ui.lightColor.value;
  lightingRoute('input:color', 'value=' + JSON.stringify(l.color));
  renderLightList();
}, 'light-color');
bindLightNumberInput(ui.lightIntensity, 'intensity');
bindLightNumberInput(ui.lightRadius, 'radius');
bindLightNumberInput(ui.lightAngle, 'angle');
bindLightNumberInput(ui.lightPitch, 'pitch');
bindLightNumberInput(ui.lightSpread, 'spread');
bindLightNumberInput(ui.lightSoftness, 'softness');
bindLightNumberInput(ui.lightSize, 'size');
lightingRoute('bind-ui:done');
return true;
}

function syncLightUI() {
setPhase('boot', 'syncLightUI');
detailLog(`syncLightUI:start lights=${lights.length} activeLightId=${activeLightId}`);
refreshPrefabSelectOptions();
if (ui.prefabSelect) ui.prefabSelect.value = String(editor.prototypeIndex);
if (ui.prefabHint) { var __proto = currentProto(); ui.prefabHint.textContent = `当前模板：${__proto.name}，局部体素 ${__proto.voxels.length} 个，尺寸 ${__proto.w}×${__proto.d}×${__proto.h}。`; }
refreshAssetScanStatus();
setActivePanelTab(inspectorState.activeTab || 'world');
refreshInspectorPanels();
var l = activeLight();
setElValue(ui.ambientStrength, String(settings.ambient));
setElText(ui.ambientValue, settings.ambient.toFixed(2));
if (ui.lightingEnabled) ui.lightingEnabled.checked = isLightingSystemEnabled();
if (ui.lightingAdvancedPanel) ui.lightingAdvancedPanel.style.display = isLightingSystemEnabled() ? '' : 'none';
setElValue(ui.shadowDebugColor, lightState.shadowDebugColor);
setElValue(ui.shadowAlpha, String(lightState.shadowAlpha));
setElText(ui.shadowAlphaValue, lightState.shadowAlpha.toFixed(2));
setElValue(ui.shadowOpacity, String(lightState.shadowOpacityScale));
setElText(ui.shadowOpacityValue, `${lightState.shadowOpacityScale.toFixed(2)}×`);
if (ui.shadowDistanceFadeEnabled) ui.shadowDistanceFadeEnabled.checked = !!lightState.shadowDistanceFadeEnabled;
setElValue(ui.shadowDistanceFadeRate, String(lightState.shadowDistanceFadeRate));
setElText(ui.shadowDistanceFadeRateValue, Number(lightState.shadowDistanceFadeRate || 0).toFixed(2));
setElValue(ui.shadowDistanceFadeMin, String(lightState.shadowDistanceFadeMin));
setElText(ui.shadowDistanceFadeMinValue, Number(lightState.shadowDistanceFadeMin || 0).toFixed(2));
if (ui.shadowEdgeFadeEnabled) ui.shadowEdgeFadeEnabled.checked = !!lightState.shadowEdgeFadeEnabled;
setElValue(ui.shadowEdgeFadePx, String(lightState.shadowEdgeFadePx));
setElText(ui.shadowEdgeFadePxValue, `${Number(lightState.shadowEdgeFadePx || 0).toFixed(1)} px`);
if (ui.shadowHighContrast) ui.shadowHighContrast.checked = !!lightState.highContrastShadow;
if (!l) return;
normalizeLight(l);
setElValue(ui.lightName, l.name);
setElValue(ui.lightType, l.type);
setElValue(ui.lightColor, l.color);
setElValue(ui.lightIntensity, String(l.intensity));
setElValue(ui.lightRadius, String(l.radius));
setElValue(ui.lightAngle, String(l.angle));
setElValue(ui.lightPitch, String(l.pitch));
setElValue(ui.lightSpread, String(l.spread));
setElValue(ui.lightSoftness, String(l.softness));
setElValue(ui.lightSize, String(l.size));
setElText(ui.lightIntensityValue, Number(l.intensity).toFixed(2));
setElText(ui.lightRadiusValue, `${Math.round(l.radius)} px`);
setElText(ui.lightAngleValue, `${Math.round(l.angle)}°`);
setElText(ui.lightPitchValue, `${Math.round(l.pitch)}°`);
setElText(ui.lightSpreadValue, `${Math.round(l.spread)}°`);
setElText(ui.lightSoftnessValue, Number(l.softness).toFixed(2));
setElText(ui.lightSizeValue, Number(l.size).toFixed(2));
setElText(ui.lightXText, l.x.toFixed(2));
setElText(ui.lightYText, l.y.toFixed(2));
setElText(ui.lightZText, l.z.toFixed(2));
setElValue(ui.lightXInput, l.x.toFixed(2));
setElValue(ui.lightYInput, l.y.toFixed(2));
setElValue(ui.lightZInput, l.z.toFixed(2));
updateLightingTypeHint(l);
renderLightList();
detailLog(`syncLightUI:done active=${l.name}/${l.type} xyz=(${l.x.toFixed(2)},${l.y.toFixed(2)},${l.z.toFixed(2)}) ambient=${settings.ambient.toFixed(2)}`);
}

function renderLightList() {
if (!ui.lightList) return;
ui.lightList.innerHTML = '';
for (const l of lights) {
  normalizeLight(l);
  const el = document.createElement('div');
  el.className = 'lightItem' + (l.id === activeLightId ? ' active' : '');
  el.innerHTML = `
    <div class="lightItemTop">
      <strong>${l.name}</strong>
      <span class="lightDot" style="background:${l.color}"></span>
    </div>
    <div class="lightMeta">${LIGHT_TYPE_LABELS[l.type]} · xyz=(${l.x.toFixed(1)}, ${l.y.toFixed(1)}, ${l.z.toFixed(1)}) · r=${Math.round(l.radius)} · i=${Number(l.intensity).toFixed(2)}</div>`;
  safeListen(el, 'click', () => { activeLightId = l.id; syncLightUI(); }, `light-list-item:${l.id}`);
  ui.lightList.appendChild(el);
}
}

function addLight() {
var src = normalizeLight({ ...(activeLight() || {}) });
var light = normalizeLight({
  ...src,
  id: nextLightId++,
  name: `${LIGHT_TYPE_LABELS[src.type] || '光源'} ${nextLightId - 1}`,
  x: src.x + 0.6,
  y: src.y + 0.6,
});
lights.push(light);
activeLightId = light.id;
syncLightUI();
}

function deleteActiveLight() {
if (lights.length <= 1) return;
var idx = lights.findIndex(l => l.id === activeLightId);
if (idx >= 0) lights.splice(idx, 1);
activeLightId = lights[Math.max(0, idx - 1)]?.id ?? lights[0].id;
syncLightUI();
}

function axisHandle(axis) {

var l = activeLight();
var base = iso(l.x, l.y, l.z);
var target;
if (axis === 'x') target = iso(l.x + 1.05, l.y, l.z);
if (axis === 'y') target = iso(l.x, l.y + 1.05, l.z);
if (axis === 'z') target = iso(l.x, l.y, l.z + 1.05);
return { base, target };
}

function hitLightAxis(mx, my) {
if (!lightState.showAxes) return null;
var axes = ['x', 'y', 'z'];
var best = null;
for (const axis of axes) {
  const { target } = axisHandle(axis);
  const d = Math.hypot(mx - target.x, my - target.y);
  if (d < 16 && (!best || d < best.d)) best = { axis, d };
}
return best ? best.axis : null;
}

function startLightAxisDrag(axis) {
lightState.dragAxis = axis;
lightState.dragStartMouse = { x: mouse.x, y: mouse.y };
lightState.dragStartLight = { ...activeLight() };
}

function updateLightAxisDrag() {
if (!lightState.dragAxis || !lightState.dragStartMouse || !lightState.dragStartLight) return;
var axis = lightState.dragAxis;
var start = lightState.dragStartLight;
var a0, a1;
if (axis === 'x') { a0 = iso(start.x, start.y, start.z); a1 = iso(start.x + 1, start.y, start.z); }
else if (axis === 'y') { a0 = iso(start.x, start.y, start.z); a1 = iso(start.x, start.y + 1, start.z); }
else { a0 = iso(start.x, start.y, start.z); a1 = iso(start.x, start.y, start.z + 1); }

var ux = a1.x - a0.x, uy = a1.y - a0.y;
var uLen = Math.hypot(ux, uy) || 1;
var nx = ux / uLen, ny = uy / uLen;
var dx = mouse.x - lightState.dragStartMouse.x;
var dy = mouse.y - lightState.dragStartMouse.y;
var projected = dx * nx + dy * ny;
var delta = projected / uLen;

var l = activeLight();
if (axis === 'x') l.x = start.x + delta;
if (axis === 'y') l.y = start.y + delta;
if (axis === 'z') l.z = Math.max(0.05, start.z - delta);
detailLog(`light-axis-drag axis=${axis} delta=${delta.toFixed(3)} xyz=(${l.x.toFixed(2)},${l.y.toFixed(2)},${l.z.toFixed(2)}) unclamped=true`);
syncLightUI();
}




function drawLightingBulb(light, active = false) {
normalizeLight(light);
var p = iso(light.x, light.y, light.z);
var rgb = hexToRgb(light.color);

if (light.type === 'directional') {
  const incoming = lightIncoming(light);
  const tail = { x: p.x - incoming.x * 28, y: p.y - incoming.y * 20 - incoming.z * 8 };
  const head = { x: p.x + incoming.x * 20, y: p.y + incoming.y * 14 };
  ctx.strokeStyle = active ? 'rgba(255,255,255,.88)' : 'rgba(255,255,255,.46)';
  ctx.lineWidth = active ? 2.6 : 2;
  ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(head.x, head.y); ctx.stroke();
  ctx.fillStyle = rgbToCss(rgb, 0.95);
  ctx.beginPath(); ctx.arc(p.x, p.y, active ? 8 : 6, 0, Math.PI * 2); ctx.fill();
  return;
}

if (light.type === 'area') {
  const size = 9 + (light.size || 1) * 6;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = rgbToCss(rgb, 0.95);
  ctx.strokeStyle = active ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.34)';
  ctx.lineWidth = active ? 2 : 1.2;
  ctx.beginPath(); ctx.rect(-size, -size * 0.55, size * 2, size * 1.1); ctx.fill(); ctx.stroke();
  ctx.restore();
  return;
}

var stem = iso(light.x, light.y, Math.max(0, light.z + 0.48));
ctx.strokeStyle = active ? 'rgba(255,255,255,.82)' : 'rgba(255,255,255,.34)';
ctx.lineWidth = active ? 2.2 : 1.4;
ctx.beginPath(); ctx.moveTo(stem.x, stem.y); ctx.lineTo(p.x, p.y); ctx.stroke();

var halo = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, active ? 26 : 17);
halo.addColorStop(0, rgbToCss(rgb, active ? 0.92 : 0.68));
halo.addColorStop(1, rgbToCss(rgb, 0));
ctx.fillStyle = halo;
ctx.beginPath(); ctx.arc(p.x, p.y, active ? 26 : 17, 0, Math.PI * 2); ctx.fill();

ctx.fillStyle = rgbToCss(rgb, 1);
ctx.beginPath(); ctx.arc(p.x, p.y, active ? 7 : 5, 0, Math.PI * 2); ctx.fill();

if (light.type === 'spot') {
  const forward = lightForward(light);
  ctx.strokeStyle = 'rgba(255,255,255,.65)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + forward.x * 24, p.y + forward.y * 16 - forward.z * 10);
  ctx.stroke();
}

if (active) {
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(p.x, p.y, 10.5, 0, Math.PI * 2); ctx.stroke();
}
}

function drawLightingAxes() {
if (!lightState.showAxes) return;
var axes = [
  { axis: 'x', color: '#ff5f6d', label: 'X' },
  { axis: 'y', color: '#59d98e', label: 'Y' },
  { axis: 'z', color: '#6fb1ff', label: 'Z' },
];
for (const { axis, color, label } of axes) {
  const { base, target } = axisHandle(axis);
  const hovered = lightState.hoverAxis === axis || lightState.dragAxis === axis;
  ctx.strokeStyle = hovered ? color : color + 'cc';
  ctx.lineWidth = hovered ? 4 : 3;
  ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(target.x, target.y); ctx.stroke();
  ctx.fillStyle = hovered ? color : color + 'dd';
  ctx.beginPath(); ctx.arc(target.x, target.y, hovered ? 9 : 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px system-ui';
  ctx.fillText(label, target.x + 9, target.y - 8);
}
}

function renderLightingShadows() {
  lightingRoute('render-shadows');
  if (typeof beginShadowPassDebug === 'function') beginShadowPassDebug('renderLightingShadows', { route: 'lighting.renderLightingShadows' });
  var result = drawLightShadows();
  if (typeof endShadowPassDebug === 'function') endShadowPassDebug('renderLightingShadows', { route: 'lighting.renderLightingShadows' });
  return result;
}

function renderLightingGlow() {
  lightingRoute('render-glow');
  return drawLightGlow();
}
