// lighting-render.js
// Step-03: 从 lighting.js 中迁出灯光渲染职责，保留全局调用兼容。

var LIGHTING_RENDER_OWNER = 'src/presentation/lighting/lighting-render.js';

function lightingRenderRoute(event, extra = '') {
  try {
    if (typeof logRoute === 'function') logRoute('lighting-render', event, extra);
    else if (typeof detailLog === 'function') detailLog(`[route][lighting-render] ${event}${extra ? ' ' + extra : ''}`);
  } catch (_err) {}
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
  lightingRenderRoute('render-shadows');
  if (typeof beginShadowPassDebug === 'function') beginShadowPassDebug('renderLightingShadows', { route: 'lighting-render.renderLightingShadows' });
  var result = drawLightShadows();
  if (typeof endShadowPassDebug === 'function') endShadowPassDebug('renderLightingShadows', { route: 'lighting-render.renderLightingShadows' });
  return result;
}

function renderLightingGlow() {
  lightingRenderRoute('render-glow');
  return drawLightGlow();
}

window.__LIGHTING_RENDER_API = {
  owner: LIGHTING_RENDER_OWNER,
  drawLightingBulb: drawLightingBulb,
  drawLightingAxes: drawLightingAxes,
  renderLightingShadows: renderLightingShadows,
  renderLightingGlow: renderLightingGlow,
};
