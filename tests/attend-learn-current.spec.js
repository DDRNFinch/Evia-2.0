const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

async function prepare(page) {
  await page.addInitScript(() => {
    localStorage.setItem('eviaWalkthroughSeenV1', '1');
    localStorage.setItem('eviaAccessibilityV1', JSON.stringify({}));
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}

test('Attend keeps the current two-action layout without a Nisia control', async ({ page }) => {
  await prepare(page);
  await page.locator('#attendanceArch').click();
  await expect(page.locator('#archDetailTitle')).toHaveText('Attend');
  await expect(page.locator('#eviaAttendActionsV4')).toBeVisible();
  await expect(page.locator('#eviaAttendActionsV4 button')).toHaveCount(2);
  await expect(page.locator('#archDetailPanel [id*="nisia" i]:visible, #archDetailPanel [data-action*="nisia" i]:visible')).toHaveCount(0);
  await expect(page.locator('#archDetailPanel')).not.toContainText(/\bNisia\b/i);
});

test('Learn keeps the current Add Learning Catch Up Ideas order', async ({ page }) => {
  await prepare(page);
  await page.locator('#learnArch').click();
  await expect(page.locator('#archDetailTitle')).toHaveText('Learn');
  const actions = page.locator('#eviaLearnActionsV4 > button');
  await expect(actions).toHaveCount(3);
  await expect(actions.nth(0)).toContainText(/Add Learning/i);
  await expect(actions.nth(1)).toContainText(/Catch\s*Up/i);
  await expect(actions.nth(2)).toContainText(/Ideas/i);
});

test('Learn preserves the current mobile pill spacing at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  await page.locator('#learnArch').click();
  const add = page.locator('#openManualLearning');
  await expect(add).toBeVisible();
  const style = await add.evaluate((node) => {
    const computed = getComputedStyle(node);
    return {
      minHeight: computed.minHeight,
      paddingTop: computed.paddingTop,
      paddingRight: computed.paddingRight,
      paddingBottom: computed.paddingBottom,
      paddingLeft: computed.paddingLeft
    };
  });
  expect(style).toEqual({ minHeight: '52px', paddingTop: '8px', paddingRight: '42px', paddingBottom: '8px', paddingLeft: '15px' });
});

test('Attend Learn current renderer has no polling patch loop or superseded files', async () => {
  const source = fs.readFileSync('evia-attend-learn.js', 'utf8');
  expect(source).not.toContain('setInterval(');
  expect(source).toContain('MutationObserver');
  expect(fs.existsSync('evia-approved-attend-learn-render-v4.js')).toBeFalsy();
  expect(fs.existsSync('evia-approved-attend-learn-final-v5.js')).toBeFalsy();
});
