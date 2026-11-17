// Local tests. Only initialize, tools/list and read-only tools are called.
// Nothing here posts, captures, or touches the network.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const shim = fileURLToPath(new URL('../server/index.js', import.meta.url));
const REAL = '/Applications/ScreenPost.app/Contents/Helpers/screenpost-mcp';
const READ_ONLY = new Set(['get_status', 'list_capabilities']);

function session(env = {}) {
  const p = spawn('node', [shim], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
  let buf = ''; const waiters = new Map(); let err = '';
  p.stderr.on('data', (d) => (err += d));
  p.stdout.on('data', (d) => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      const m = JSON.parse(line);
      waiters.get(m.id)?.(m);
    }
  });
  let n = 0;
  return {
    p, err: () => err,
    call(method, params) {
      const id = ++n;
      return new Promise((res, rej) => {
        const t = setTimeout(() => rej(new Error('timeout ' + method)), 15000);
        waiters.set(id, (m) => { clearTimeout(t); res(m); });
        p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      });
    },
    notify(method) { p.stdin.write(JSON.stringify({ jsonrpc: '2.0', method }) + '\n'); },
    close() { p.stdin.end(); return new Promise((r) => p.on('exit', (c, s) => r({ c, s }))); },
  };
}

const init = { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'shim-test', version: '0' } };

// (b) missing helper: clear JSON-RPC error plus stderr message
{
  const s = session({ SCREENPOST_MCP_HELPER: '/nonexistent/screenpost-mcp' });
  const r = await s.call('initialize', init);
  assert.equal(r.error.code, -32000);
  assert.match(r.error.message, /https:\/\/screenpost\.app/);
  assert.match(r.error.message, /Settings > Agents/);
  const { c } = await s.close();
  assert.equal(c, 1);
  assert.match(s.err(), /not installed/);
  console.log('ok missing helper: JSON-RPC error + stderr, exit 1');
}

// exit code passthrough with a fake helper
{
  const fake = new URL('./fake-exit.sh', import.meta.url).pathname;
  fs.writeFileSync(fake, '#!/bin/sh\nexit 7\n', { mode: 0o755 });
  const s = session({ SCREENPOST_MCP_HELPER: fake });
  const { c } = await s.close();
  fs.unlinkSync(fake);
  assert.equal(c, 7);
  console.log('ok exit code forwarded (7)');
}

// (a) real helper, if present and agents are on
if (fs.existsSync(REAL)) {
  const s = session();
  const r = await s.call('initialize', init);
  assert.ok(r.result, 'initialize failed: ' + JSON.stringify(r));
  s.notify('notifications/initialized');
  const t = await s.call('tools/list', {});
  const names = t.result.tools.map((x) => x.name);
  console.log('ok real helper: server', r.result.serverInfo?.name, 'tools', names.length);
  assert.ok(names.length > 0);
  for (const name of READ_ONLY) {
    if (!names.includes(name)) continue;
    const c = await s.call('tools/call', { name, arguments: {} });
    assert.ok(c.result || c.error, name + ' no reply');
    console.log('ok', name, c.error ? 'error: ' + c.error.message : 'returned');
  }
  if (process.env.DUMP_TOOLS) console.log(names.join('\n'));
  await s.close();
} else {
  console.log('skip real helper (ScreenPost not installed)');
}
