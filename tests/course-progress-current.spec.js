const { test, expect } = require('@playwright/test');

async function prepareCourse(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('eviaWalkthroughSeenV1', '1');
    localStorage.setItem('eviaAccessibilityV1', JSON.stringify({}));

    const course = [{
      label: 'Unit A',
      children: [
        {
          label: 'Task one',
          ksbTargets: ['K1'],
          recommended: { label: 'Written', type: 'text', details: [{ displayType: 'Written', label: 'Short answer', instruction: 'Explain task one.' }] }
        },
        {
          label: 'Task two',
          ksbTargets: ['K1'],
          recommended: { label: 'Written', type: 'text', details: [{ displayType: 'Written', label: 'Short answer', instruction: 'Explain task two.' }] }
        }
      ]
    }];

    const meta = {
      courseType: 'ksb',
      title: 'Current Progress Parity',
      qualificationId: 'EVIA-PARITY',
      mappings: {
        K1: [
          ['Unit A', 'Task one'],
          ['Unit A', 'Task two']
        ]
      },
      officialItems: { K1: 'Current official wording' },
      ksbOrder: ['K1']
    };

    localStorage.setItem('eviaNaxosCourse', JSON.stringify(course));
    localStorage.setItem('eviaNaxosCourseTitle', 'Current Progress Parity');
    localStorage.setItem('eviaNaxosCourseMetaV1', JSON.stringify(meta));
    localStorage.setItem('eviaCompletedEvidencePathsV1', JSON.stringify([
      JSON.stringify(['Unit A', 'Task one'])
    ]));
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
}

test('a KSB mapped to two evidence locations is only half complete when one location is complete', async ({ page }) => {
  await prepareCourse(page);

  const progress = await page.evaluate(() => targetProgress('K1'));
  expect(progress.completed).toBe(1);
  expect(progress.total).toBe(2);
  expect(progress.fraction).toBe(0.5);
  expect(progress.percent).toBe(50);
  expect(progress.complete).toBeFalsy();

  await page.locator('#courseArch').click();
  const tile = page.locator('[data-course-target="K1"]');
  await expect(tile).toBeVisible();
  await expect(tile).not.toHaveClass(/\bmet\b/);
  await expect(tile).toHaveAttribute('aria-label', /1 of 2 mapped evidence locations complete/i);
  await expect(tile.locator('.criterion-progress-ring')).toHaveCount(1);
});

test('the same KSB reaches complete only when both mapped evidence locations are complete', async ({ page }) => {
  await prepareCourse(page);

  await page.evaluate(() => {
    markEvidencePathComplete(['Unit A', 'Task two']);
    renderCoursePage();
  });

  const progress = await page.evaluate(() => targetProgress('K1'));
  expect(progress.completed).toBe(2);
  expect(progress.total).toBe(2);
  expect(progress.percent).toBe(100);
  expect(progress.complete).toBeTruthy();

  const tile = page.locator('[data-course-target="K1"]');
  await expect(tile).toHaveClass(/\bmet\b/);
  await expect(tile).toHaveAttribute('aria-label', /2 of 2 mapped evidence locations complete/i);
  await expect(tile.locator('.criterion-progress-tick')).toHaveText('✓');
});
