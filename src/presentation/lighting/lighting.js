// lighting.js
// Step-03: 灯光渲染职责已迁移到 src/presentation/lighting/lighting-render.js。
// 当前文件仅作为过渡占位，避免脚本路径与工程认知骤变。

var LIGHTING_MODULE_OWNER = 'src/presentation/lighting/lighting.js';

function lightingModuleRoute(event, extra = '') {
  try {
    if (typeof logRoute === 'function') logRoute('lighting-module', event, extra);
    else if (typeof detailLog === 'function') detailLog(`[route][lighting-module] ${event}${extra ? ' ' + extra : ''}`);
  } catch (_err) {}
}

lightingModuleRoute('module-loaded', 'render-owner=' + String((window.__LIGHTING_RENDER_API && window.__LIGHTING_RENDER_API.owner) || 'missing'));
