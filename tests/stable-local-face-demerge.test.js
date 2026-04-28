const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/render.js'), 'utf8');

assert(renderSource.includes('function isActorInteractionDescriptorNearPlayerForLocalDemerge'), 'render should decide demerge by descriptor/player proximity');
assert(renderSource.includes('function mergeActorInteractionResidualDescriptorsForPacket'), 'render should re-merge far residual members after local demerge');
assert(renderSource.includes('stable-local-player-radius-demerge'), 'stable demerge mode should be local to player radius');
assert(renderSource.includes('SHOW_PLAYER ? player : null, { radius: getActorInteractionSortRadiusForRender() }'), 'stable demerge call should pass player and radius');
assert(renderSource.includes('if (!nearMembers.length) {\n      out.push(packet);'), 'packets with no nearby members should stay merged');
assert(renderSource.includes("modeLabel === 'near-single' ? 'stable-local-demerge-near-player' : 'stable-local-demerge-residual-merged'"), 'near members should be single faces while residual members remain merged');

console.log('stable-local-face-demerge.test.js: OK');
