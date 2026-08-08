'use strict';
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('styles/main.css', 'utf8');
const js = fs.readFileSync('src/presentation/ui/main-sidebar-collapse.js', 'utf8');

assert(html.includes('id="mainSidebar"'), 'main sidebar id missing');
assert(html.includes('id="sidebarCollapseToggle"'), 'sidebar collapse button missing');
assert(html.includes('main-sidebar-collapse.js?v=20260807-apple-ui-v11'), 'collapse runtime not loaded');
assert(css.includes('--apple-font:'), 'Apple font stack missing');
assert(css.includes('"SF Pro Text"'), 'SF Pro Text missing from font stack');
assert(css.includes('.layout.sidebarCollapsed'), 'collapsed layout CSS missing');
assert(css.includes('backdrop-filter:blur'), 'glass material CSS missing');
assert(js.includes("hzh.main.sidebarCollapsed"), 'sidebar persistence key missing');
assert(js.includes("window.dispatchEvent(new Event('resize'))"), 'viewport resize notification missing');
assert(!js.includes('renderer.resize'), 'UI collapse code must not own Pixi renderer.resize');
console.log('main-apple-ui.test.js: OK');
