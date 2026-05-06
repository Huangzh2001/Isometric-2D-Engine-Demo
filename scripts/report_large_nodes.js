#!/usr/bin/env node
/*
 * Reports large JavaScript nodes. This is informational and never fails.
 * Run from project root:
 *   node scripts/report_large_nodes.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const thresholdBytes = Number(process.argv[2] || 50000);
const skipDirs = new Set(['.git', 'node_modules']);

function walk(rel, out = []) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.isDirectory() && skipDirs.has(entry.name)) continue;
    const child = path.join(rel, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) walk(child, out);
    else if (entry.isFile() && child.endsWith('.js')) {
      const stat = fs.statSync(path.join(root, child));
      if (stat.size >= thresholdBytes) out.push({ path: child, bytes: stat.size, kb: Number((stat.size / 1024).toFixed(1)) });
    }
  }
  return out;
}

const files = walk('src').sort((a, b) => b.bytes - a.bytes);
const report = {
  status: 'INFO',
  thresholdBytes,
  count: files.length,
  files,
};
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
