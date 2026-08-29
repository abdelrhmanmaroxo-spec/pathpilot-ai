import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { test } from 'node:test';

async function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForStatus(url, child, output, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Production server exited during startup (code ${child.exitCode}).\n${output()}`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(750) });
      if (response.ok) return response;
    } catch {
      // The process may still be binding the socket; retry briefly.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Production server did not become ready within ${timeoutMs}ms.\n${output()}`);
}

test('production entrypoint starts and serves the research status endpoint', { timeout: 15_000 }, async (t) => {
  const port = await reservePort();
  assert.ok(port, 'expected an available local port');

  let stdout = '';
  let stderr = '';
  const child = spawn(process.execPath, ['server/intelligence-v3-server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_PATH: ':memory:',
      ALLOWED_ORIGINS: 'http://localhost:5173',
      AI_API_KEY: '',
      TAVILY_API_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });

  t.after(() => {
    if (child.exitCode === null) child.kill('SIGTERM');
  });

  const response = await waitForStatus(
    `http://127.0.0.1:${port}/api/research/status`,
    child,
    () => `stdout:\n${stdout}\nstderr:\n${stderr}`,
  );
  const payload = await response.json();

  assert.equal(payload.researchAvailable, false);
  assert.equal(payload.synthesisAvailable, false);
  assert.equal(payload.appliesToAllTools, true);
  assert.match(stdout, /PathPilot intelligence v3 beta listening on port/);
});
