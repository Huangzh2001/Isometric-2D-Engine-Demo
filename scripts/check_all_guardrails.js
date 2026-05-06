#!/usr/bin/env node
/*
 * Consolidated project guardrail entry point.
 * Run from project root:
 *   node scripts/check_all_guardrails.js
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const guardrails = [
  'scripts/check_project_hygiene.js',
  'scripts/check_main_path_refs.js',
  'scripts/check_render_extracted_symbols.js',
  'scripts/check_render_builder_boundary.js',
  'scripts/check_render_cache_boundary.js',
  'scripts/check_frame_assembler_boundary.js',
  'scripts/check_render_order_boundary.js',
  'scripts/check_canvas_draw_backend_boundary.js',
  'scripts/check_canvas_shadow_backend_boundary.js',
  'scripts/check_canvas_shadow_overlay_cache_boundary.js',
  'scripts/check_static_world_frame_materializer_boundary.js',
  'scripts/check_static_renderable_color_cache_boundary.js',
  'scripts/check_render_build_diagnostics_gate_boundary.js',
  'scripts/check_canvas_static_world_face_draw_pass_boundary.js',
  'scripts/check_canvas_floor_layer_boundary.js',
  'scripts/check_canvas2d_frame_diagnostics_boundary.js',
  'scripts/check_canvas2d_zoom_preview_state_boundary.js',
  'scripts/check_canvas2d_static_bitmap_run_cache_boundary.js',
  'scripts/check_canvas2d_static_packet_fallback_draw_boundary.js',
  'scripts/check_canvas2d_renderable_order_draw_boundary.js',
  'scripts/check_canvas2d_overlay_hud_pass_boundary.js',
  'scripts/check_canvas2d_interaction_pipeline_capture_boundary.js',
  'scripts/check_canvas2d_frame_pipeline_boundary.js',
  'scripts/check_canvas2d_active_render_frame_boundary.js',
  'scripts/check_asset_prefab_scan_service_boundary.js',
  'scripts/check_habbo_root_config_service_boundary.js',
  'scripts/check_habbo_library_service_boundary.js',
  'scripts/check_custom_prefab_storage_boundary.js',
  'scripts/check_prefab_select_refresh_boundary.js',
  'scripts/check_habbo_asset_file_service_boundary.js',
  'scripts/check_habbo_placement_import_service_boundary.js',
  'scripts/check_asset_workflow_service_boundary.js',
  'scripts/check_scene_snapshot_builder_boundary.js',
  'scripts/check_scene_snapshot_applier_boundary.js',
  'scripts/check_render_diagnostics_boundary.js',
  'scripts/check_state_legacy_boundary.js',
  'scripts/check_controller_shell_boundary.js',
  'scripts/check_controller_registry_boundary.js',
  'scripts/check_controller_diagnostics_boundary.js',
  'scripts/check_terrain_generation_diagnostics_boundary.js',
  'scripts/check_terrain_apply_job_controller_boundary.js',
  'scripts/check_terrain_clear_controller_boundary.js',
  'scripts/check_terrain_generation_controller_boundary.js',
  'scripts/check_render_logic_boundary.js',
  'scripts/check_render_logic_interaction_boundary.js',
  'scripts/check_render_hit_test_boundary.js',
  'scripts/check_render_preview_interaction_boundary.js',
  'scripts/check_ui_camera_render_panel_boundary.js',
  'scripts/check_ui_terrain_panel_refresh_boundary.js',
  'scripts/check_editor_ui_boundary.js',
  'scripts/check_p11_final_large_node_audit.js',
  'scripts/check_final_hygiene_freeze.js',
];

const results = [];
for (const rel of guardrails) {
  const startedAt = Date.now();
  const child = spawnSync(process.execPath, [rel], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  const durationMs = Date.now() - startedAt;
  const stdout = String(child.stdout || '').trim();
  const stderr = String(child.stderr || '').trim();
  results.push({
    script: rel,
    status: child.status === 0 ? 'PASS' : 'FAIL',
    exitCode: child.status,
    durationMs,
    stdout: stdout.slice(0, 4000),
    stderr: stderr.slice(0, 4000),
  });
  if (child.status !== 0) break;
}

const failed = results.filter((result) => result.status !== 'PASS');
const report = {
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  checked: results.length,
  total: guardrails.length,
  failed: failed.map((result) => result.script),
  results,
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
process.exit(failed.length ? 1 : 0);
