const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
  console,
  window: null,
  globalThis: null,
  TextDecoder,
  Uint8Array,
  Uint8ClampedArray,
  ArrayBuffer,
  DataView,
  Map,
  Set,
  Math,
  Number,
  String,
  Object,
  Array,
  JSON,
  RegExp,
  Date,
  Promise,
  DecompressionStream,
  Response,
  Blob,
  document: { createElement() { return { width: 0, height: 0, getContext() { return null; }, toDataURL() { return ''; } }; } },
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('src/infrastructure/habbo-calibration/habbo-swf-calibration-runtime.js', 'utf8'), context, { filename: 'habbo-runtime.js' });

const runtime = context.HabboCalibrationRuntime;
assert(runtime, 'Habbo runtime missing');

const visualizationXml = `
<visualizationData type="door_test">
  <visualization size="64" layerCount="2" angle="45">
    <layers>
      <layer id="0" x="1" y="2" z="3"/>
      <layer id="1" x="4" y="5" z="6"/>
      <layer id="2" x="0" y="0" z="0" alpha="51"/>
    </layers>
    <directions>
      <direction id="0"><layer id="0" z="100"/><layer id="1" z="5"/></direction>
      <direction id="2"><layer id="0" z="4"/><layer id="1" z="120"/></direction>
      <direction id="4"/>
      <direction id="6"/>
    </directions>
    <animations>
      <animation id="0">
        <animationLayer id="0"/>
        <animationLayer id="1"><frameSequence><frame id="0"/></frameSequence></animationLayer>
      </animation>
      <animation id="1">
        <animationLayer id="0"><frameSequence><frame id="1"/></frameSequence></animationLayer>
        <animationLayer id="1"/>
      </animation>
      <animation id="2">
        <animationLayer id="0"><frameSequence><frame id="2"/></frameSequence></animationLayer>
        <animationLayer id="1"><frameSequence><frame id="3"/></frameSequence></animationLayer>
      </animation>
    </animations>
  </visualization>
</visualizationData>`;

const assets = [];
for (const direction of [0, 2, 4, 6]) {
  for (const frame of [0, 1, 2, 3]) {
    assets.push(`<asset name="door_test_64_a_${direction}_${frame}" x="10" y="20"/>`);
    assets.push(`<asset name="door_test_64_b_${direction}_${frame}" x="11" y="21"/>`);
  }
  assets.push(`<asset name="door_test_64_sd_${direction}_0" x="0" y="0"/>`);
}
const meta = runtime.parseHabboSwfMetadataFromXmls({
  visualizationXml,
  assetsXml: `<assets>${assets.join('')}</assets>`,
  objectDataXml: '<objectData type="door_test"><model><dimensions x="1" y="1" z="1"/></model></objectData>',
  objectXml: '<object type="door_test" visualization="door_test" logic="door_test"/>',
});

const vis = runtime.chooseHabboVisualization(meta, 64);
assert(vis, 'visualization size 64 missing');
assert.deepStrictEqual(Array.from(vis.directions), [0, 2, 4, 6]);
assert.strictEqual(vis.directionLayers['0'][0].z, 100);
assert.strictEqual(vis.directionLayers['2'][1].z, 120);
assert.strictEqual(runtime.getHabboAnimationFrameForLayer(vis, 0, 0), 0, 'self-closing animationLayer must use frame 0');
assert.strictEqual(runtime.getHabboAnimationFrameForLayer(vis, 1, 0), 0);
assert.strictEqual(runtime.getHabboAnimationFrameForLayer(vis, 0, 1), 1);
assert.strictEqual(runtime.getHabboAnimationFrameForLayer(vis, 1, 1), 0, 'state 1 self-closing layer must not inherit another layer frame');
assert.strictEqual(runtime.getHabboAnimationFrameForLayer(vis, 0, 2), 2);
assert.strictEqual(runtime.getHabboAnimationFrameForLayer(vis, 1, 2), 3);
assert.deepStrictEqual(Array.from(runtime.getHabboVisualizationStates(meta, 64)), [0, 1, 2]);

const bitmaps = {};
for (const asset of meta.assets) bitmaps[asset.name] = { width: 16, height: 16, dataUrl: 'data:image/png;base64,AA==' };
const state0 = runtime.scoreHabboVisualizationState(meta, bitmaps, 0, 64);
const state1 = runtime.scoreHabboVisualizationState(meta, bitmaps, 1, 64);
const state2 = runtime.scoreHabboVisualizationState(meta, bitmaps, 2, 64);
assert(state0.validLayers > 0 && state1.validLayers > 0 && state2.validLayers > 0, 'all declared states should be renderable');
assert.strictEqual(runtime.getHabboVisualizationState(meta, bitmaps, 64), 0, 'equally complete states should select the smallest id deterministically');

console.log('habbo-multi-state-parser.test.js: OK');
