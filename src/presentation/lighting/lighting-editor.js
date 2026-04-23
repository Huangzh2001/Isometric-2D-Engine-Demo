// lighting-editor.js
// Step-02: 从 lighting.js 中迁出灯光编辑器交互与面板同步，保留全局调用兼容。

var LIGHTING_EDITOR_OWNER = 'src/presentation/lighting/lighting-editor.js';

function lightingEditorRoute(event, extra = '') {
  try {
    if (typeof logRoute === 'function') logRoute('lighting-editor', event, extra);
    else if (typeof detailLog === 'function') detailLog(`[route][lighting-editor] ${event}${extra ? ' ' + extra : ''}`);
  } catch (_err) {}
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
    lightingEditorRoute('input:' + key, 'value=' + String(l[key]));
    syncLightUI();
  }, `light-number:${key}`);
}

function bindLightingUi() {
if (__lightingUiBound) return true;
if (!ui || typeof safeListen !== 'function') return false;
__lightingUiBound = true;
lightingEditorRoute('bind-ui:start');
safeListen(ui.lightingEnabled, 'change', () => {
  lightState.enabled = !!ui.lightingEnabled.checked;
  lightingEditorRoute('input:lightingEnabled', 'value=' + String(lightState.enabled));
  syncLightUI();
  if (typeof invalidateShadowGeometryCache === 'function') invalidateShadowGeometryCache('lighting-enabled-toggle');
}, 'lighting-enabled');
safeListen(ui.lightName, 'input', () => {
  const l = activeLight();
  if (!l) return;
  l.name = ui.lightName.value || '未命名光源';
  lightingEditorRoute('input:name', 'value=' + JSON.stringify(l.name));
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
  lightingEditorRoute('input:type', 'value=' + JSON.stringify(l.type));
  syncLightUI();
}, 'light-type');
safeListen(ui.lightColor, 'input', () => {
  const l = activeLight();
  if (!l) return;
  l.color = ui.lightColor.value;
  lightingEditorRoute('input:color', 'value=' + JSON.stringify(l.color));
  renderLightList();
}, 'light-color');
bindLightNumberInput(ui.lightIntensity, 'intensity');
bindLightNumberInput(ui.lightRadius, 'radius');
bindLightNumberInput(ui.lightAngle, 'angle');
bindLightNumberInput(ui.lightPitch, 'pitch');
bindLightNumberInput(ui.lightSpread, 'spread');
bindLightNumberInput(ui.lightSoftness, 'softness');
bindLightNumberInput(ui.lightSize, 'size');
lightingEditorRoute('bind-ui:done');
return true;
}

function syncLightUI() {
setPhase('boot', 'syncLightUI');
detailLog(`syncLightUI:start lights=${lights.length} activeLightId=${activeLightId}`);
if (ui.prefabSelect) ui.prefabSelect.value = String(editor.prototypeIndex);
lightingEditorRoute('sync-light-ui:skip-prefab-refresh', `prototypeIndex=${editor.prototypeIndex}`);
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

window.__LIGHTING_EDITOR_API = {
  owner: LIGHTING_EDITOR_OWNER,
  updateLightingTypeHint: updateLightingTypeHint,
  bindLightingUi: bindLightingUi,
  syncLightUI: syncLightUI,
  renderLightList: renderLightList,
  addLight: addLight,
  deleteActiveLight: deleteActiveLight,
  axisHandle: axisHandle,
  hitLightAxis: hitLightAxis,
  startLightAxisDrag: startLightAxisDrag,
  updateLightAxisDrag: updateLightAxisDrag,
};
