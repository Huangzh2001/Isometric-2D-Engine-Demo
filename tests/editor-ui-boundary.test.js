#!/usr/bin/env node
const { execFileSync } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
execFileSync('node', ['scripts/check_editor_ui_boundary.js'], { cwd: root, stdio: 'inherit' });
