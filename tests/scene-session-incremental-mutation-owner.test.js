const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'core', 'state', 'scene-session-state.js');
const text = fs.readFileSync(file, 'utf8');
function assert(cond, msg){ if(!cond){ throw new Error(msg); } }
assert(text.includes("step: 'incrementalAddInstance'"), 'missing incrementalAddInstance commit profile');
assert(text.includes("step: 'incrementalRemoveInstance'"), 'missing incrementalRemoveInstance commit profile');
assert(/function addInstance\(instance, meta\)[\s\S]*appendInstanceBoxesIncrementally\(instance, meta/.test(text), 'addInstance does not use incremental append path');
assert(/function removeInstanceByIdOwned\(instanceId, meta\)[\s\S]*removeInstanceBoxesIncrementally\(instanceId, meta/.test(text), 'removeInstanceByIdOwned does not use incremental remove path');
console.log('scene-session incremental mutation owner contract ok');
