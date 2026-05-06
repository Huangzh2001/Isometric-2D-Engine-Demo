#!/usr/bin/env node
const { execFileSync } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
execFileSync('node', ['scripts/check_final_hygiene_freeze.js'], { cwd: root, stdio: 'inherit' });
