const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('EPA physically reuses the same homepage Evia DOM instance', async ({ page }) => {
  // This test verifies the DOM identity hand-off only. Prevent the PWA updater from
  // navigating the page mid-assertion when a cache version changes.
  await page.route('**/service-worker.js', route => route.abort());
  await page.goto('/');
  await expect(page.locator('#eviaStage > .evia-float')).toHaveCount(1);

  if (!(await page.evaluate(() => Boolean(globalThis.EVIA_EPA_UI_FIX_V1)))) {
    const source = fs.readFileSync(path.join(root, 'evia-approved-epa-ui-fix-v1.js'), 'utf8');
    await page.addScriptTag({ content: source });
  }

  await page.locator('#eviaStage > .evia-float').evaluate(el => {
    el.dataset.epaIdentityProbe = 'real-home-evia';
  });

  await page.evaluate(() => {
    const existing = document.getElementById('eviaEpaZoneV2');
    if (existing) {
      existing.classList.add('open');
      return;
    }
    const zone = document.createElement('section');
    zone.id = 'eviaEpaZoneV2';
    zone.className = 'evia-epa-zone-v2 open';
    zone.innerHTML = '<div class="evia-epa-stage-v2"><div class="evia-epa-avatar-v2"></div></div>';
    document.getElementById('screen').appendChild(zone);
  });

  const moved = page.locator('#eviaEpaZoneV2 .evia-epa-home-character-host-v84 > .evia-float[data-epa-identity-probe="real-home-evia"]');
  await expect(moved).toHaveCount(1);
  await expect(page.locator('#eviaStage > .evia-float')).toHaveCount(0);
  await expect(moved.locator(':scope > .evia-character > .evia-body > .eyes > .eye')).toHaveCount(2);

  await page.evaluate(() => document.getElementById('eviaEpaZoneV2').classList.remove('open'));
  await expect(page.locator('#eviaStage > .evia-float[data-epa-identity-probe="real-home-evia"]')).toHaveCount(1);
  await expect(page.locator('#eviaEpaZoneV2 .evia-float')).toHaveCount(0);
});
