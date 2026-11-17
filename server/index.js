#!/usr/bin/env node
'use strict';
// ScreenPost MCP shim. Spawns the stdio helper that ships inside ScreenPost.app
// and passes stdin/stdout/stderr straight through. No dependencies, no network.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const readline = require('node:readline');

const DEFAULT_HELPER = '/Applications/ScreenPost.app/Contents/Helpers/screenpost-mcp';
// SCREENPOST_MCP_HELPER exists for local testing only; normal use needs no env.
const helper = process.env.SCREENPOST_MCP_HELPER || DEFAULT_HELPER;
const HELP = 'ScreenPost is not installed or its MCP helper was not found at ' + helper +
  '. Install ScreenPost from https://screenpost.app and turn on Settings > Agents > "Allow agents to control ScreenPost".';

function isExecutable(p) {
  try { fs.accessSync(p, fs.constants.X_OK); return fs.statSync(p).isFile(); } catch { return false; }
}

function runDegraded() {
  process.stderr.write('screenpost-mcp: ' + HELP + '\n');
  const rl = readline.createInterface({ input: process.stdin });
  rl.on('line', (line) => {
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    if (msg && msg.id !== undefined && msg.id !== null && msg.method) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: HELP },
      }) + '\n');
    }
  });
  rl.on('close', () => process.exit(1));
}

function runHelper() {
  const child = spawn(helper, [], { stdio: ['pipe', 'pipe', 'inherit'] });
  process.stdin.pipe(child.stdin);
  child.stdout.pipe(process.stdout);
  child.stdin.on('error', () => {});
  process.stdin.on('end', () => child.stdin.end());
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(sig, () => child.kill(sig));
  }
  child.on('error', (err) => {
    process.stderr.write('screenpost-mcp: could not start helper: ' + err.message + '\n' + HELP + '\n');
    process.exit(127);
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      process.removeAllListeners(signal);
      process.kill(process.pid, signal);
    } else {
      process.exit(code === null ? 1 : code);
    }
  });
}

if (isExecutable(helper)) runHelper(); else runDegraded();
