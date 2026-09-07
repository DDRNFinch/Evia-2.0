const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function runtimeScripts() {
  const source = fs.readFileSync(path.join(root, 'evia-runtime-manifest.js'), 'utf8');
  const context = {};
  context.globalThis = context;
  vm.runInNewContext(source, context);
  return Array.from(context.EVIA_RUNTIME_SCRIPTS || []);
}

function cleanRuntimePath(value) {
  return String(value || '').replace(/^\.\//, '').split('?')[0];
}

async function bootControlled(context, app) {
  // Seed a different prior release marker so CI exercises Evia's normal
  // update/activation path without triggering the one-time first-install
  // client.navigate() while Playwright itself is navigating the smoke page.
  // No application or service-worker code is bypassed or replaced.
  await app.goto('/evia-release.json', { waitUntil: 'domcontentloaded' });
  await app.evaluate(async () => {
    const marker = await caches.open('evia-update-ui-ready-v1');
    const releaseUrl = new URL('/__evia-visible-release-version__', location.origin).href;
    await marker.put(releaseUrl, new Response('__smoke_previous_release__', {
      headers: { 'content-type': 'text/plain' }
    }));
  });

  const workerStarted = context.serviceWorkers().length
    ? Promise.resolve(context.serviceWorkers()[0])
    : context.waitForEvent('serviceworker', { timeout: 15000 }).catch(() => null);

  await app.goto('/?__evia_smoke=1', { waitUntil: 'domcontentloaded' });
  await expect(app.locator('#eviaStage')).toBeVisible();

  const firstWorker = await workerStarted;
  expect(firstWorker || context.serviceWorkers()[0], 'Evia service worker did not start').toBeTruthy();

  const ready = await app.evaluate(async () => {
    if (!navigator.serviceWorker) return false;
    return Promise.race([
      navigator.serviceWorker.ready.then((registration) => Boolean(registration.active)),
      new Promise((resolve) => setTimeout(() => resolve(false), 20000))
    ]);
  });
  expect(ready, 'Evia service worker did not become active').toBeTruthy();

  await expect.poll(async () => app.evaluate(() => Boolean(
    navigator.serviceWorker && navigator.serviceWorker.controller
  )).catch(() => false), {
    timeout: 10000,
    intervals: [100, 250, 500, 1000]
  }).toBeTruthy();

  // Reload once through the active worker so the test validates the actual
  // service-worker HTML/runtime injection path used by installed Evia.
  await app.reload({ waitUntil: 'domcontentloaded' });
  await expect(app.locator('#eviaStage')).toBeVisible();
  await expect.poll(async () => app.evaluate(() => Boolean(
    navigator.serviceWorker && navigator.serviceWorker.controller
  )).catch(() => false), {
    timeout: 10000,
    intervals: [100, 250, 500, 1000]
  }).toBeTruthy();

  return app;
}

function trackPageErrors(page, errors = []) {
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test('cold launch activates the complete approved runtime without uncaught errors', async ({ page, context }) => {
  const errors = trackPageErrors(page);
  const app = await bootControlled(context, page);

  const expected = runtimeScripts().map(cleanRuntimePath);
  const loaded = await app.locator('script[src]').evaluateAll((nodes) => nodes.map((node) => {
    try { return new URL(node.src).pathname.split('/').pop(); } catch { return ''; }
  }).filter(Boolean));

  for (const script of expected) {
    expect(loaded, `${script} was not present after the controlled reload`).toContain(script.split('/').pop());
  }

  await expect(app.locator('.bottom-arches .status-arch')).toHaveCount(4);
  await expect(app.locator('.bottom-arches .status-arch .arch-progress-svg')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('core learner surfaces open: evidence, Learn, portfolio and chat', async ({ page, context }) => {
  const errors = trackPageErrors(page);
  const app = await bootControlled(context, page);

  const evidenceApi = await app.evaluate(() => typeof goToEvidencePath === 'function');
  expect(evidenceApi).toBeTruthy();
  await app.evaluate(async () => { await goToEvidencePath(['Knowledge', 'K1 · Stationery Detective']); });
  await expect(app.locator('#evidenceScreen')).toBeVisible();
  await expect(app.locator('.evidence-choice')).toHaveCount(2);
  await expect(app.locator('#evidenceRequirements')).toBeVisible();

  await app.evaluate(() => { if (typeof closeEvidence === 'function') closeEvidence(); });
  await app.locator('#learnArch').click();
  await expect(app.locator('#archDetailPanel')).toHaveAttribute('aria-hidden', 'false');
  await expect(app.locator('#archDetailContent')).toContainText(/Learning|Learn|hours/i);

  await app.evaluate(() => {
    if (typeof closeArchDetail === 'function') closeArchDetail();
  });
  await app.evaluate(async () => { if (typeof openPortfolio === 'function') await openPortfolio(); });
  await expect(app.locator('#portfolioPanel')).toHaveAttribute('aria-hidden', 'false');

  await app.evaluate(() => { if (typeof closePortfolio === 'function') closePortfolio(false); });
  await app.evaluate(() => { if (typeof openChat === 'function') openChat(); });
  await expect(app.locator('#chatPanel')).toHaveAttribute('aria-hidden', 'false');
  await expect(app.locator('#chatOptions')).not.toBeEmpty();

  expect(errors).toEqual([]);
});

test('Ask Evia works inside both Teach Me and Test Me with a controlled AI response', async ({ page, context }) => {
  const errors = trackPageErrors(page);

  await context.addInitScript(() => {
    localStorage.clear();
    const course = [{
      label: 'Health and safety',
      children: [{
        label: 'K1 · Health and safety',
        requirements: 'Explain how health and safety requirements affect the work you carry out.',
        ksbTargets: ['K1'],
        recommended: { label: 'Written', type: 'text', details: [{ displayType: 'Written', label: 'Short answer', instruction: 'Explain the requirement.' }] }
      }]
    }];
    const meta = {
      courseType: 'ksb',
      qualificationId: 'EVIA-SMOKE-TEST',
      standardCode: 'EVIA-SMOKE-TEST',
      standardTitle: 'Evia Smoke Test',
      mappings: { K1: [['Health and safety', 'K1 · Health and safety']] },
      ksbOrder: ['K1'],
      criteria: [{ id: 'K1', wording: 'Health and safety requirements and how they affect occupational work.' }]
    };
    localStorage.setItem('eviaNaxosCourse', JSON.stringify(course));
    localStorage.setItem('eviaNaxosCourseTitle', 'Evia Smoke Test');
    localStorage.setItem('eviaNaxosCourseMetaV1', JSON.stringify(meta));
  });

  await context.route('https://evia-teach-test.finchyisnow.workers.dev/v1/teach-test', async (route) => {
    const request = route.request();
    let body = {};
    try { body = request.postDataJSON(); } catch {}
    if (body.mode === 'test') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          mode: 'test',
          subject: 'ask',
          title: 'Cavity tray test',
          questions: Array.from({ length: 5 }, (_, index) => ({
            question: `Smoke test question ${index + 1}?`,
            answers: [`Correct ${index + 1}`, `Wrong A ${index + 1}`, `Wrong B ${index + 1}`, `Wrong C ${index + 1}`],
            correct: 0,
            explanation: 'Controlled smoke-test explanation.',
            mappedTo: ['K1'],
            difficulty: 'competent'
          }))
        })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        mode: 'teach',
        subject: 'ask',
        title: 'Cavity trays',
        focus: 'Cavity trays',
        mappedTo: ['K1'],
        teaching: [
          'Controlled teaching point one.',
          'Controlled teaching point two.',
          'Controlled teaching point three.'
        ]
      })
    });
  });

  const app = await bootControlled(context, page);
  await app.evaluate(async () => { openChat(); await startTeachMe(); });
  const teachAsk = app.locator('.evia-inline-chat-options [data-chat-action="ai-ask-teach"]');
  await expect(teachAsk).toBeVisible();
  await teachAsk.click();
  await expect(app.locator('#eviaAiAskForm')).toHaveClass(/open/);
  await app.locator('#eviaAiAskInput').fill('cavity trays');
  await app.locator('#eviaAiAskForm button[type="submit"]').click();
  await expect(app.locator('#chatScroll')).toContainText('Controlled teaching point three.', { timeout: 15000 });

  await app.evaluate(async () => { await startTestMe(); });
  const testAsk = app.locator('.evia-inline-chat-options [data-chat-action="ai-ask-test"]');
  await expect(testAsk).toBeVisible();
  await testAsk.click();
  await app.locator('#eviaAiAskInput').fill('cavity trays');
  await app.locator('#eviaAiAskForm button[type="submit"]').click();
  await expect(app.locator('#chatScroll')).toContainText('Smoke test question 1?', { timeout: 15000 });

  expect(errors).toEqual([]);
});

test('installed Evia reloads while offline', async ({ page, context }) => {
  const errors = trackPageErrors(page);
  const app = await bootControlled(context, page);

  await context.setOffline(true);
  try {
    await app.reload({ waitUntil: 'domcontentloaded' });
    await expect(app.locator('#eviaStage')).toBeVisible();
    await expect(app.locator('.bottom-arches .status-arch')).toHaveCount(4);
  } finally {
    await context.setOffline(false);
  }

  expect(errors).toEqual([]);
});
