const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

const HARNESS = '<!doctype html><html><head></head><body>\n<button id="timeArch" type="button">Time</button>\n<button id="backButton" type="button">Back</button>\n<div id="archDetailPanel" aria-hidden="true"><div class="arch-detail-card"><div id="archDetailTitle" class="arch-detail-title"></div><div id="archDetailContent" class="arch-detail-content"></div></div></div>\n<div id="portfolioPanel" aria-hidden="true"></div>\n<div id="portfolioViewer"><div class="portfolio-viewer-actions"></div></div>\n<div id="portfolioTitle"></div>\n<button id="portfolioEditEvidence" type="button">Edit</button>\n<button id="portfolioDeleteEvidence" type="button">Delete</button>\n<button id="downloadPortfolio" type="button">Download ZIP</button>\n<script>\nwindow.learnerProfile={startDate:\'2026-01-01\',endDate:\'2026-12-31\'};\nwindow.learningEntries=[];\nwindow.completedEvidencePaths=new Set();window.activeCourseTitle=\'Test course\';window.archDetailStack=[];\nwindow.courseProgressPercent=()=>55;window.completedCourseProgress=()=>({completed:42,total:100,percent:42});\nwindow.totalLearningRequirement=()=>100;window.learnerLearningHours=()=>0;window.loadAttendanceData=()=>({collegeLearningHours:0});\nwindow.courseLeaves=()=>Array.from({length:100});window.officialLearnerProfile=()=>({});window.inferredCourseMeta=()=>({courseType:\'standard\'});window.courseMetaMappings=()=>({});window.evidencePathKey=path=>JSON.stringify(path||[]);\nwindow.getPortfolioEntries=async()=>[\n{id:\'sep-1\',createdAt:\'2026-09-02T12:00:00\',type:\'text\',mimeType:\'text/plain\',fileName:\'rams.txt\',path:[\'Health and safety\',\'K1\'],evidenceLabel:\'Follow RAMS, induction or toolbox information\'},\n{id:\'sep-2\',createdAt:\'2026-09-05T09:00:00\',type:\'photo\',mimeType:\'image/jpeg\',fileName:\'bond.jpg\',path:[\'Brickwork\',\'S1\'],evidenceLabel:\'Build a different bond or broken bond detail\'},\n{id:\'sep-3\',createdAt:\'2026-09-05T10:00:00\',type:\'text\',mimeType:\'text/plain\',fileName:\'sealant.txt\',path:[\'Health and safety\',\'K2\'],evidenceLabel:\'Apply sealant and manage paints or chemicals safely\'},\n{id:\'plaster-photo-1\',createdAt:\'2026-09-06T09:00:00\',type:\'photo\',mimeType:\'image/jpeg\',fileName:\'plaster-1.jpg\',path:[\'Repairs\',\'S2\'],evidenceLabel:\'Prepare and repair a plaster defect\'},\n{id:\'plaster-photo-2\',createdAt:\'2026-09-06T09:05:00\',type:\'photo\',mimeType:\'image/jpeg\',fileName:\'plaster-2.jpg\',path:[\'Repairs\',\'S2\'],evidenceLabel:\'Prepare and repair a plaster defect\'},\n{id:\'plaster-photo-3\',createdAt:\'2026-09-06T09:10:00\',type:\'photo\',mimeType:\'image/jpeg\',fileName:\'plaster-3.jpg\',path:[\'Repairs\',\'S2\'],evidenceLabel:\'Prepare and repair a plaster defect\'},\n{id:\'plaster-audio\',createdAt:\'2026-09-06T09:15:00\',type:\'audio\',mimeType:\'audio/webm\',fileName:\'plaster.webm\',path:[\'Repairs\',\'S2\'],evidenceLabel:\'Prepare and repair a plaster defect\'},\n{id:\'after-end\',createdAt:\'2027-01-06T11:00:00\',type:\'text\',mimeType:\'text/plain\',fileName:\'late.txt\',path:[\'Completion\',\'K3\'],evidenceLabel:\'Evidence after planned end date\'}\n];\nwindow.openArchShell=title=>{document.getElementById(\'archDetailTitle\').textContent=title;const p=document.getElementById(\'archDetailPanel\');p.classList.add(\'open\');p.setAttribute(\'aria-hidden\',\'false\')};\nwindow.closeArchDetail=()=>{const p=document.getElementById(\'archDetailPanel\');p.classList.remove(\'open\');p.setAttribute(\'aria-hidden\',\'true\')};window.updateBackButton=()=>{};\nwindow.openPortfolio=async()=>{const p=document.getElementById(\'portfolioPanel\');p.classList.add(\'open\');p.setAttribute(\'aria-hidden\',\'false\')};window.openEvidenceViewer=async entry=>{window.__openedEvidence=entry.id};\nwindow.closePortfolio=()=>{const p=document.getElementById(\'portfolioPanel\');p.classList.remove(\'open\');p.setAttribute(\'aria-hidden\',\'true\')};window.deleteActiveEvidence=async()=>{};\nwindow.downloadPortfolioZip=async()=>{window.__portfolioDownloaded=true};\nwindow.createZip=async()=>new Blob([\'zip\'],{type:\'application/zip\'});\n</script></body></html>';

async function openHarness(browser) {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.route('http://127.0.0.1:4173/time-harness', route => route.fulfill({ status: 200, contentType: 'text/html', body: HARNESS }));
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/time-harness', { waitUntil: 'domcontentloaded' });
  await page.addScriptTag({ url: 'http://127.0.0.1:4173/evia-approved-time-monthly-packs-v1.js?v=9' });
  await expect.poll(async () => page.evaluate(() => Boolean(window.EviaMonthlyPacks?.renderTimeTimeline))).toBeTruthy();
  await page.evaluate(() => document.getElementById('timeArch').click());
  await expect(page.locator('.evia-time-screen')).toBeVisible();
  return { context, page };
}

test('Time is a month-by-month evidence browser with a 70 percent month carousel', async ({ browser }) => {
  const { context, page } = await openHarness(browser);
  await expect(page.locator('#archDetailPanel')).toHaveClass(/evia-time-fullscreen/);
  await expect(page.locator('.evia-time-month-carousel')).toBeVisible();
  await expect(page.locator('.evia-time-course-strip')).toBeVisible();
  await expect(page.locator('[data-evia-progress-month="2026-01"]')).toHaveClass(/start/);
  await expect(page.locator('[data-evia-progress-month="2026-09"]')).toHaveClass(/epa/);
  await expect(page.locator('[data-evia-progress-month="2026-12"]')).toHaveClass(/end/);
  await expect(page.locator('[data-evia-progress-month="2026-09"] i')).toHaveText('✓');
  await expect(page.locator('.evia-time-carousel-hints')).toBeAttached();
  await expect(page.locator('[data-evia-time-month="2027-01"]')).toBeAttached();

  await page.evaluate(() => { const month=document.querySelector('[data-evia-time-month=\"2026-09\"]'); if(month&&!month.classList.contains('active'))month.click(); });
  await expect(page.locator('[data-evia-time-month="2026-09"]')).toHaveClass(/active/);
  await expect(page.locator('[data-evia-progress-month="2026-09"]')).toHaveClass(/selected/);
  await expect(page.locator('.evia-time-month-summary')).toHaveCount(0);
  await expect(page.locator('.evia-time-month-heading')).toHaveCount(0);
  await expect(page.locator('.evia-time-month-count')).toHaveCount(0);
  await expect(page.locator('.evia-time-evidence-card')).toHaveCount(4);
  await expect(page.locator('.evia-time-evidence-card').nth(0)).toContainText('Follow RAMS');
  await expect(page.locator('.evia-time-evidence-card').nth(3)).toContainText('Prepare and repair a plaster defect');
  await expect(page.locator('.evia-time-evidence-card').nth(3)).toContainText('3 Photos');
  await expect(page.locator('.evia-time-evidence-card').nth(3)).toContainText('1 Audio');

  const monthColours = await page.evaluate(() => ({ active:getComputedStyle(document.querySelector('[data-evia-time-month=\"2026-09\"]')).backgroundColor, inactive:getComputedStyle(document.querySelector('[data-evia-time-month=\"2026-08\"]')).backgroundColor }));
  expect(monthColours.active).toBe('rgb(245, 196, 0)');
  expect(monthColours.inactive).toBe('rgb(255, 246, 199)');

  await page.locator('[data-evia-time-month="2026-09"]').click();
  await expect(page.locator('[data-evia-time-month-picker]')).toBeVisible();
  await expect(page.locator('[data-evia-month-pick="2026-09"] em')).toHaveText('7');
  await expect(page.locator('[data-evia-month-pick="2027-01"] em')).toHaveText('1');
  await page.locator('[data-evia-month-picker-close]').click();
  await expect(page.locator('[data-evia-time-month-picker]')).toBeHidden();

  const widths = await page.evaluate(() => {
    const carousel = document.querySelector('.evia-time-month-carousel');
    const active = carousel.querySelector('.evia-time-month-option.active');
    return { carousel: carousel.getBoundingClientRect().width, active: active.getBoundingClientRect().width };
  });
  expect(widths.active / widths.carousel).toBeGreaterThan(0.64);
  expect(widths.active / widths.carousel).toBeLessThan(0.74);

  await page.locator('[data-evia-time-month="2027-01"]').click();
  await expect(page.locator('.evia-time-month-summary')).toHaveCount(0);
  await expect(page.locator('.evia-time-evidence-card')).toHaveCount(1);
  await expect(page.locator('.evia-time-evidence-card')).toContainText('Evidence after planned end date');

  await page.locator('[data-evia-time-close]').click();
  await expect(page.locator('#archDetailPanel')).toHaveAttribute('aria-hidden', 'true');
  await context.close();
});

test('Time evidence opens the existing editable portfolio viewer and download offers month or whole portfolio', async ({ browser }) => {
  const { context, page } = await openHarness(browser);
  await page.evaluate(() => { const month=document.querySelector('[data-evia-time-month=\"2026-09\"]'); if(month&&!month.classList.contains('active'))month.click(); });
  await expect(page.locator('[data-evia-time-month="2026-09"]')).toHaveClass(/active/);
  await page.locator('.evia-time-evidence-card').nth(3).click();
  await expect.poll(async () => page.evaluate(() => window.__openedEvidence || '')).toBe('plaster-photo-1');
  await expect(page.locator('.evia-timeline-evidence-nav')).toBeVisible();
  await expect(page.locator('.evia-timeline-evidence-nav span')).toHaveText('1 of 4');
  await page.evaluate(() => document.querySelector('[data-evia-timeline-next]')?.click());
  await expect.poll(async () => page.evaluate(() => window.__openedEvidence || '')).toBe('plaster-photo-2');
  await expect(page.locator('.evia-timeline-evidence-nav span')).toHaveText('2 of 4');
  await expect(page.locator('#portfolioEditEvidence')).toBeAttached();

  await page.evaluate(() => document.getElementById('backButton').click());
  await expect(page.locator('.evia-time-screen')).toBeVisible();

  await page.locator('[data-evia-time-download]').click();
  await expect(page.locator('[data-evia-download-month]')).toHaveText('Download month');
  await expect(page.locator('[data-evia-download-portfolio]')).toHaveText('Download portfolio');
  await page.locator('[data-evia-download-portfolio]').click();
  await expect.poll(async () => page.evaluate(() => Boolean(window.__portfolioDownloaded))).toBeTruthy();
  await context.close();
});

test('Time keeps one source of truth and the existing portfolio edit contract', async () => {
  const html = fs.readFileSync('index.html','utf8');
  const time = fs.readFileSync('evia-approved-time-monthly-packs-v1.js','utf8');
  const manifest = fs.readFileSync('evia-runtime-manifest.js','utf8');
  const worker = fs.readFileSync('service-worker.js','utf8');
  expect(html).not.toContain('function renderTimePage()');
  expect((time.match(/function renderTimeTimeline\(/g)||[]).length).toBe(1);
  expect((manifest.match(/evia-approved-time-monthly-packs-v1\.js/g)||[]).length).toBe(1);
  expect(manifest).toContain("'./evia-approved-time-monthly-packs-v1.js?v=9'");
  expect(time).toContain('timeVisibleGroups');
  expect(time).toContain('data-evia-time-group');
  expect(time).toContain('evidenceGroupTypeSummary');
  expect(time).toContain('evia-time-month-carousel');
  expect(time).toContain('evia-time-course-strip');
  expect(time).toContain('Expected EPA');
  expect(time).toContain('data-evia-month-pick');
  expect(time).toContain('evia-time-carousel-hints');
  expect(time).toContain('padding:7px 15%');
  expect(time).toContain('buildEvidenceMonthPack');
  expect(time).toContain('Download portfolio');
  expect(time).toContain('latestEvidence&&latestEvidence>end');
  expect(html).toContain("portfolioEditEvidence.addEventListener('click'");
  expect(worker).toContain("const C='evia-pwa-v91'");
  expect(worker).toContain("const RELEASE_VERSION='1.2'");
});
