const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/render.js'), 'utf8');
const stableLocalDemergeSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/interaction/stable-local-demerge.js'), 'utf8');
const assemblerSource = fs.readFileSync(path.join(__dirname, '..', 'src/application/render/main-frame-renderable-assembler.js'), 'utf8');

assert(stableLocalDemergeSource.includes('function isActorInteractionDescriptorNearPlayerForLocalDemerge'), 'stable local demerge owner should decide demerge by descriptor/player proximity');
assert(stableLocalDemergeSource.includes('function mergeActorInteractionResidualDescriptorsForPacket'), 'stable local demerge owner should re-merge far residual members after local demerge');
assert(stableLocalDemergeSource.includes('stable-local-player-radius-demerge'), 'stable demerge mode should be local to player radius');
assert(assemblerSource.includes('SHOW_PLAYER ? player : null, { radius: getActorInteractionSortRadiusForRender() }'), 'stable demerge call should pass player and radius');
assert(stableLocalDemergeSource.includes('if (!nearMembers.length) {\n      out.push(packet);'), 'packets with no nearby members should stay merged');
assert(stableLocalDemergeSource.includes("modeLabel === 'near-single' ? 'stable-local-demerge-near-player' : 'stable-local-demerge-residual-merged'"), 'near members should be single faces while residual members remain merged');

console.log('stable-local-face-demerge.test.js: OK');
