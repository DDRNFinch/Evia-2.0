const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const workerPath = path.resolve(__dirname, '..', 'cloudflare-ai', 'worker-v5.js');
let loadedWorker;

async function currentWorker() {
  if (!loadedWorker) {
    const source = fs.readFileSync(workerPath, 'utf8');
    const moduleUrl = `data:text/javascript;base64,${Buffer.from(source, 'utf8').toString('base64')}`;
    const module = await import(moduleUrl);
    loadedWorker = module.default;
  }
  return loadedWorker;
}

function env() {
  return {
    ALLOWED_ORIGIN: 'https://ddrnfinch.github.io',
    MODEL: '@cf/meta/llama-3.1-8b-instruct-fast',
    EPA_MODEL: '@cf/nvidia/nemotron-3-120b-a12b',
    EPA_FALLBACK_MODEL: '@cf/zai-org/glm-4.7-flash',
    EPA_STRUCTURED_FALLBACK_MODEL: '@cf/meta/llama-3.1-8b-instruct-fast',
    AI: {
      async run() {
        throw new Error('AI should not be called by routing parity tests.');
      }
    }
  };
}

test('current Worker is self-contained and no longer imports superseded Worker layers', async () => {
  const source = fs.readFileSync(workerPath, 'utf8');
  expect(source).not.toMatch(/^\s*import\s/m);
  expect(source).not.toContain('./worker-v2.js');
  expect(source).not.toContain('./worker-v3.js');
  expect(source).not.toContain('./worker-v4.js');
  expect(source).toContain('/v1/teach-test');
  expect(source).toContain('/v1/epa-discussion');
  expect(source).toContain("EPA_ENGINE_VERSION='native-json-fallback-v1'");
});

test('current Worker health route preserves Teach Test EPA and structured fallback metadata', async () => {
  const worker = await currentWorker();
  const response = await worker.fetch(new Request('https://evia.test/health'), env(), {});
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toMatchObject({
    ok: true,
    service: 'evia-teach-test',
    scope: 'teach-test-plus-epa',
    model: '@cf/meta/llama-3.1-8b-instruct-fast',
    epaModel: '@cf/nvidia/nemotron-3-120b-a12b',
    epaFallbackModel: '@cf/zai-org/glm-4.7-flash',
    epaEngineVersion: 'native-json-fallback-v1',
    epaStructuredFallbackModel: '@cf/meta/llama-3.1-8b-instruct-fast'
  });
});

test('current Worker still delegates Teach Test and EPA routes', async () => {
  const worker = await currentWorker();
  const currentEnv = env();

  const teach = await worker.fetch(new Request('https://evia.test/v1/teach-test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode: 'unsupported', subject: 'trade' })
  }), currentEnv, {});
  expect(teach.status).toBe(400);
  await expect(teach.json()).resolves.toMatchObject({ ok: false, error: 'Unsupported Teach/Test request.' });

  const epa = await worker.fetch(new Request('https://evia.test/v1/epa-discussion', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'unsupported' })
  }), currentEnv, {});
  expect(epa.status).toBe(400);
  await expect(epa.json()).resolves.toMatchObject({ ok: false, error: 'Unsupported EPA practice action.' });
});
