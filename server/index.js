#!/usr/bin/env node
'use strict';
// ScreenPost MCP shim. Spawns the stdio helper that ships inside ScreenPost.app
// and passes stdin/stdout/stderr straight through. No dependencies, no network.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const VERSION = '1.0.1';

const DEFAULT_HELPER = '/Applications/ScreenPost.app/Contents/Helpers/screenpost-mcp';
// SCREENPOST_MCP_HELPER exists for local testing only; normal use needs no env.
const helper = process.env.SCREENPOST_MCP_HELPER || DEFAULT_HELPER;
const HELP = 'ScreenPost is not installed or its MCP helper was not found at ' + helper +
  '. Install ScreenPost from https://screenpost.app and turn on Settings > Agents > "Allow agents to control ScreenPost".';

function isExecutable(p) {
  try { fs.accessSync(p, fs.constants.X_OK); return fs.statSync(p).isFile(); } catch { return false; }
}

// Without the app, still answer the MCP handshake and list the real tool catalog
// (server/tools.json, captured from the helper) so clients and directories can
// inspect the server. Every tool call returns the install instructions instead.
function runDegraded() {
  process.stderr.write('screenpost-mcp: ' + HELP + '\n');
  let tools = [];
  try { tools = JSON.parse(fs.readFileSync(path.join(__dirname, 'tools.json'), 'utf8')); } catch {}
  const reply = (id, body) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, ...body }) + '\n');
  const rl = readline.createInterface({ input: process.stdin });
  rl.on('line', (line) => {
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    if (!msg || msg.id === undefined || msg.id === null || !msg.method) return;
    switch (msg.method) {
      case 'initialize':
        return reply(msg.id, { result: {
          protocolVersion: (msg.params && msg.params.protocolVersion) || '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'screenpost', version: VERSION },
          instructions: 'ScreenPost is not running on this machine, so tools only return setup instructions. ' + HELP,
        } });
      case 'ping':
        return reply(msg.id, { result: {} });
      case 'tools/list':
        return reply(msg.id, { result: { tools } });
      case 'tools/call':
        return reply(msg.id, { result: { content: [{ type: 'text', text: HELP }], isError: true } });
      default:
        return reply(msg.id, { error: { code: -32601, message: 'Method not found: ' + msg.method } });
    }
  });
  // Let pending stdout drain (large tool list) before the process ends.
  rl.on('close', () => { process.exitCode = 0; });
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
  // 'close' fires after the helper's stdout has ended; the empty write's callback
  // runs once everything piped before it has been flushed to our stdout.
  child.on('close', (code, signal) => {
    process.stdout.write('', () => {
      if (signal) {
        process.removeAllListeners(signal);
        process.kill(process.pid, signal);
      } else {
        process.exit(code === null ? 1 : code);
      }
    });
  });
}

if (isExecutable(helper)) runHelper(); else runDegraded();
