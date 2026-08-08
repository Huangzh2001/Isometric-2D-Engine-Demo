const fs = require('fs');
const path = require('path');
const vm = require('vm');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extractFunction(source, name) {
  const needle = `function ${name}`;
  const asyncNeedle = `async function ${name}`;
  let start = source.indexOf(asyncNeedle);
  if (start < 0) start = source.indexOf(needle);
  if (start < 0) throw new Error(`missing function ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1] || '';
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

const root = path.join(__dirname, '..');
const stateSource = fs.readFileSync(path.join(root, 'src/infrastructure/legacy/state.js'), 'utf8');
const itemFacingSource = fs.readFileSync(path.join(root, 'src/core/domain/item-facing-core.js'), 'utf8');

const context = {
  Uint8Array,
  ArrayBuffer,
  TextDecoder,
  DecompressionStream,
  Response,
  Blob,
  Math,
  Number,
  String,
  Object,
  Array,
  JSON,
  RegExp,
  console,
  pushHabboDebug() {},
  habboTrace() {},
  detailLog() {},
  window: { __APP_NAMESPACE: { bind() {} } }
};
vm.createContext(context);

const parserStart = stateSource.indexOf('function bytesToLatin1Text');
const parserEnd = stateSource.indexOf('function makeCanvas2D', parserStart);
assert(parserStart >= 0 && parserEnd > parserStart, 'Habbo metadata parser slice should exist');
vm.runInContext(stateSource.slice(parserStart, parserEnd), context, { filename: 'habbo-metadata-parser.js' });
vm.runInContext(itemFacingSource, context, { filename: 'item-facing-core.js' });

async function inspect(fileName) {
  const bytes = fs.readFileSync(path.join(root, 'assets/habbo_import_samples', fileName));
  const inflated = await context.inflateSwfBytes(bytes);
  const tags = context.parseSwfTags(inflated);
  const xmls = context.collectHabboXmlTextsFromTags(tags);
  const meta = context.parseHabboSwfMetadataFromXmls(xmls);
  const sizeMap = meta.visualizationInfo && meta.visualizationInfo.sizes ? meta.visualizationInfo.sizes : {};
  const sizeKeys = Object.keys(sizeMap).map(Number).filter(Number.isFinite).sort((a, b) => b - a);
  const preferredSize = sizeMap[64] ? 64 : (sizeKeys[0] || 0);
  const vis = sizeMap[preferredSize] || null;
  const sourceDirections = vis && Array.isArray(vis.directions) && vis.directions.length
    ? Array.from(vis.directions)
    : Array.from(meta.visualDirections || []);
  const plan = context.window.__ITEM_FACING_CORE__.buildHabboFacingPlan(sourceDirections);
  return {
    fileName,
    type: meta.type,
    dimensions: meta.dimensions,
    preferredSize,
    sourceDirections,
    strategy: plan.strategy,
    directionMap: plan.directionMap
  };
}

(async () => {
  const single = await inspect('nft_snst_fireplace.swf');
  assert(single.sourceDirections.join(',') === '2', 'fireplace sample should expose one source direction');
  assert(single.strategy === 'single-mirror', 'one-direction fireplace should use single-mirror');
  assert(single.directionMap.map(entry => entry.mirrorX).join(',') === 'false,true,false,true', 'single-view map should alternate original/mirror');

  const twoA = await inspect('nft_cm2_croksleepingbag.swf');
  assert(twoA.sourceDirections.join(',') === '0,2', 'sleeping bag sample should expose directions 0,2');
  assert(twoA.strategy === 'two-mirror', '0,2 sample should use two-mirror');

  const twoB = await inspect('nft_cm2_sprucechair.swf');
  assert(twoB.sourceDirections.join(',') === '2,4', 'chair sample should expose directions 2,4');
  assert(twoB.strategy === 'two-mirror', '2,4 sample should use two-mirror');

  console.log(JSON.stringify({ status: 'PASS', samples: [single, twoA, twoB] }, null, 2));
})().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
