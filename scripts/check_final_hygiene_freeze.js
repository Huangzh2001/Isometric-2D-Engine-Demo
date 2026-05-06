#!/usr/bin/env node
/*
 * P10 final hygiene freeze check.
 * Verifies that the consolidated guardrail entry point, final handoff docs,
 * and no-regression ownership freeze are present.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function walk(rel, out = []) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const child = path.join(rel, entry.name).replace(/\\/g, '/');
    out.push({ rel: child, name: entry.name, isDirectory: entry.isDirectory(), isFile: entry.isFile() });
    if (entry.isDirectory()) walk(child, out);
  }
  return out;
}

const requiredFiles = [
  'scripts/check_all_guardrails.js',
  'scripts/check_final_hygiene_freeze.js',
  'scripts/report_large_nodes.js',
  'tests/final-hygiene-freeze.test.js',
  'docs/P10_FINAL_HYGIENE_FREEZE.zh-CN.md',
  'docs/REMAINING_LARGE_NODES.zh-CN.md',
  'docs/CANONICAL_OWNER_MAP.zh-CN.md',
  'AGENTS.md',
];
for (const rel of requiredFiles) {
  if (!exists(rel)) errors.push(`missing P10 required file: ${rel}`);
}

if (errors.length === 0) {
  const checkAll = read('scripts/check_all_guardrails.js');
  const requiredGuardrails = [
    'check_project_hygiene.js',
    'check_main_path_refs.js',
    'check_render_extracted_symbols.js',
    'check_render_builder_boundary.js',
    'check_render_cache_boundary.js',
    'check_frame_assembler_boundary.js',
    'check_render_order_boundary.js',
    'check_canvas_draw_backend_boundary.js',
    'check_canvas_shadow_backend_boundary.js',
    'check_canvas_static_world_face_draw_pass_boundary.js',
    'check_canvas_floor_layer_boundary.js',
    'check_render_diagnostics_boundary.js',
    'check_state_legacy_boundary.js',
    'check_controller_shell_boundary.js',
    'check_render_logic_boundary.js',
    'check_render_logic_interaction_boundary.js',
    'check_render_hit_test_boundary.js',
    'check_render_preview_interaction_boundary.js',
    'check_editor_ui_boundary.js',
    'check_final_hygiene_freeze.js',
  ];
  for (const script of requiredGuardrails) {
    if (!checkAll.includes(script)) errors.push(`check_all_guardrails.js missing guardrail: ${script}`);
  }

  const agents = read('AGENTS.md');
  for (const phrase of [
    'P10 Final Hygiene Freeze',
    'node scripts/check_all_guardrails.js',
    'Do not bypass the consolidated guardrail check',
  ]) {
    if (!agents.includes(phrase)) errors.push(`AGENTS.md missing P10 freeze phrase: ${phrase}`);
  }

  const ownerMap = read('docs/CANONICAL_OWNER_MAP.zh-CN.md');
  for (const rel of [
    'scripts/check_all_guardrails.js',
    'docs/REMAINING_LARGE_NODES.zh-CN.md',
    'src/presentation/render/render.js',
    'src/presentation/render/logic.js',
  ]) {
    if (!ownerMap.includes(rel)) errors.push(`CANONICAL_OWNER_MAP missing final freeze reference: ${rel}`);
  }

  const finalDoc = read('docs/P10_FINAL_HYGIENE_FREEZE.zh-CN.md');
  for (const phrase of [
    '统一检查入口',
    '不得回退',
    '剩余大节点',
    'node scripts/check_all_guardrails.js',
  ]) {
    if (!finalDoc.includes(phrase)) errors.push(`P10 final doc missing phrase: ${phrase}`);
  }

  const largeNodesDoc = read('docs/REMAINING_LARGE_NODES.zh-CN.md');
  for (const rel of [
    'src/presentation/render/render.js',
    'src/application/controllers/app-controllers.js',
    'src/presentation/render/logic.js',
    'src/infrastructure/legacy/state.js',
  ]) {
    if (!largeNodesDoc.includes(rel)) errors.push(`remaining large nodes doc missing: ${rel}`);
  }

  const rootSrcEntries = fs.readdirSync(path.join(root, 'src'), { withFileTypes: true }).map((entry) => entry.name).sort();
  const expectedSrcEntries = ['application', 'core', 'infrastructure', 'presentation'];
  if (JSON.stringify(rootSrcEntries) !== JSON.stringify(expectedSrcEntries)) {
    errors.push(`src top-level entries are not frozen to four layers: ${rootSrcEntries.join(', ')}`);
  }

  const forbiddenLegacyTopSrc = 'src/infrastructure/legacy/top-src';
  if (exists(forbiddenLegacyTopSrc)) errors.push(`forbidden legacy source dump exists: ${forbiddenLegacyTopSrc}`);

  const misplacedStageArtifacts = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^v\d+.*(?:evidence|delivery)/i.test(name) || /^README_PLAYER_STEP_/i.test(name) || name === 'testwrite');
  for (const name of misplacedStageArtifacts) errors.push(`stage artifact returned to root: ${name}`);

  const duplicateCheckNames = new Set();
  for (const entry of walk('scripts')) {
    if (!entry.isFile || !/^check_.*\.js$/.test(entry.name)) continue;
    if (duplicateCheckNames.has(entry.name)) errors.push(`duplicate guardrail script filename: ${entry.name}`);
    duplicateCheckNames.add(entry.name);
  }
  if (duplicateCheckNames.size < requiredGuardrails.length) {
    warnings.push(`guardrail script count looks low: ${duplicateCheckNames.size}`);
  }
}

const report = { status: errors.length === 0 ? 'PASS' : 'FAIL', errors, warnings };
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(errors.length ? 1 : 0);
