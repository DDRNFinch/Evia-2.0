const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

test('self-contained viewer embeds grouped evidence and creates media Blob URLs without sibling files', async ({ page }) => {
  await page.setContent('<!doctype html><html><body><script>window.courseMetaMappings=()=>({K1:["Unit A","Skill one"],K22:["Unit A","Skill one"],S2:["Unit A","Skill two"]});</script></body></html>');
  await page.addScriptTag({ url: 'http://127.0.0.1:4173/evia-evidence-viewer-pack-v2.js?v=2' });
  await page.addScriptTag({ url: 'http://127.0.0.1:4173/evia-evidence-ksb-index-v1.js?v=2' });
  const built = await page.evaluate(async () => {
    const pngBytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4iAAAAAASUVORK5CYII='), c => c.charCodeAt(0));
    const photo = (name) => new Blob([pngBytes], { type:'image/png' });
    const entries = [
      { id:'p1', createdAt:'2026-09-05T09:00:00', type:'photo', mimeType:'image/png', fileName:'photo-1.png', path:['Unit A','Skill one'], evidenceLabel:'Build a test wall', blob:photo('1') },
      { id:'p2', createdAt:'2026-09-05T09:05:00', type:'photo', mimeType:'image/png', fileName:'photo-2.png', path:['Unit A','Skill one'], evidenceLabel:'Build a test wall', blob:photo('2') },
      { id:'p3', createdAt:'2026-09-05T09:10:00', type:'photo', mimeType:'image/png', fileName:'photo-3.png', path:['Unit A','Skill one'], evidenceLabel:'Build a test wall', blob:photo('3') },
      { id:'a1', createdAt:'2026-09-05T09:15:00', type:'audio', mimeType:'audio/webm', fileName:'reflection.webm', path:['Unit A','Skill one'], evidenceLabel:'Build a test wall', assessmentGuide:'Explain the checks and the finished result.', blob:new Blob(['embedded-audio-bytes'],{type:'audio/webm'}) },
      { id:'t1', createdAt:'2026-09-06T10:00:00', type:'text', mimeType:'text/plain', fileName:'writeup.txt', path:['Unit A','Skill two'], evidenceLabel:'Explain safe working', blob:new Blob(['I checked the work area and explained the safe method.'],{type:'text/plain'}) }
    ];
    const files = await window.EviaEvidencePackViewer.buildViewerFiles(entries, {
      scopeType:'month', scopeLabel:'September 2026', course:'Test Standard', learner:{firstName:'Test',lastName:'Learner'},
      epaPlan:{ courseId:'TEST', planVersion:'1.0', title:'Test Standard EPA', methodLabels:{'multiple-choice-test':'Multiple-choice test','practical-assessment-with-questions':'Practical assessment with questions','interview-underpinned-by-portfolio':'Interview underpinned by a portfolio of evidence'}, ksbMethods:{K1:'multiple-choice-test',K22:'practical-assessment-with-questions',S2:'interview-underpinned-by-portfolio'} }
    });
    const mapping=files.find(file=>file.name==='KSB Evidence Mapping.pdf');
    return { names:files.map(file=>file.name), html:new TextDecoder().decode(files[0].data), readme:new TextDecoder().decode(files[1].data), mappingHead:new TextDecoder().decode(mapping.data.slice(0,8)), mappingText:new TextDecoder().decode(mapping.data) };
  });

  expect(built.names).toEqual(['Open Evidence Viewer.html','Evidence Viewer - Read Me.txt','KSB Evidence Mapping.pdf']);
  expect(built.mappingHead).toBe('%PDF-1.4');
  expect(built.mappingText).toContain('1 0 0 1 36 806 Tm');
  expect(built.mappingText).toContain('1 0 0 1 36 24 Tm');
  expect(built.mappingText).not.toMatch(/Tf 36 -?\d+ Td/);
  expect((built.mappingText.match(/1 0 0 1 36 \d+ Tm/g)||[]).length).toBeGreaterThan(5);
  expect(built.html).toContain('Self-contained offline evidence pack');
  expect(built.html).toContain('September 2026');
  expect(built.html).toContain('Build a test wall');
  expect(built.html).toContain('3 Photos');
  expect(built.html).toContain('1 Audio');
  expect(built.html).toContain('KSB Evidence Index');
  expect(built.html).toContain('EV-001');
  expect(built.html).toContain('K22');
  expect(built.html).toContain('Practical assessment with questions');
  expect(built.html).toContain('"base64":"');
  expect(built.html).not.toContain('Evidence/01-');
  expect(built.html).not.toContain('src="Evidence/');
  expect(built.html).not.toContain('https://');
  expect(built.html).not.toContain('http://');
  expect(built.readme).toContain('embedded copy');
  expect(built.readme).toContain('does not depend on neighbouring Evidence files');

  await page.setContent(built.html, { waitUntil:'domcontentloaded' });
  await expect(page.locator('#slide')).toContainText('2 evidence sections');
  await expect(page.locator('#slide')).toContainText('5 evidence files');

  await page.locator('#ksbBtn').click();
  await expect(page.locator('#slide')).toContainText('KSB Evidence Index');
  await expect(page.locator('#slide')).toContainText('K22');
  await expect(page.locator('#slide')).toContainText('EV-001');
  await page.locator('#ksbSearch').fill('K22');
  await expect(page.locator('.ksb-row')).toHaveCount(1);
  await page.locator('[data-ksb-jump="1"]').click();
  await expect(page.locator('#slide')).toContainText('EV-001');
  await expect(page.locator('#slide')).toContainText('Build a test wall');
  await page.locator('#prev').click();
  await expect(page.locator('#slide')).toContainText('2 evidence sections');

  await page.locator('#next').click();
  await expect(page.locator('#slide')).toContainText('Build a test wall');
  await expect(page.locator('#slide')).toContainText('3 Photos');
  await expect(page.locator('#slide')).toContainText('1 Audio');
  await expect(page.locator('.attachment-tab')).toHaveCount(4);
  await expect(page.locator('img#activeMedia')).toHaveAttribute('src', /^blob:/);
  await page.locator('[data-item="3"]').click();
  await expect(page.locator('audio#activeMedia')).toHaveAttribute('src', /^blob:/);
  await expect(page.locator('audio#activeMedia')).toHaveAttribute('preload','metadata');

  await page.locator('#next').click();
  await expect(page.locator('#slide')).toContainText('Explain safe working');
  await expect(page.locator('.text-evidence')).toContainText('I checked the work area');

  await page.setViewportSize({ width:390, height:844 });
  await expect(page.locator('#menu')).toBeVisible();
  await expect(page.locator('#slide')).toBeVisible();
});

test('month and portfolio downloads add self-contained viewer while preserving existing export contents', async () => {
  const manifest = fs.readFileSync('evia-runtime-manifest.js','utf8');
  const index = fs.readFileSync('index.html','utf8');
  const time = fs.readFileSync('evia-approved-time-monthly-packs-v1.js','utf8');
  const viewer = fs.readFileSync('evia-evidence-viewer-pack-v2.js','utf8');

  expect(manifest).toContain("'./evia-evidence-viewer-pack-v2.js?v=2'");
  expect(manifest).toContain("'./evia-evidence-ksb-index-v1.js?v=2'");
  expect(index).toContain('./evia-runtime-manifest.js?v=91');
  expect(index).toContain('EVIA_RUNTIME_SCRIPTS');
  expect(manifest).toContain("'./evia-approved-time-monthly-packs-v1.js?v=9'");
  expect(index).toContain('EviaEvidencePackViewer.buildViewerFiles(entries');
  expect(index).toContain("name: 'portfolio.json'");
  expect(time).toContain('EviaEvidencePackViewer.buildViewerFiles(entries');
  expect(time).toContain("name:`${label} - Evidence.pdf`");
  expect(time).toContain("name:'month-evidence.json'");
  expect(viewer).toContain("name:'Open Evidence Viewer.html'");
  expect(viewer).toContain('blobBase64');
  expect(viewer).toContain('embeddedUrl');
  expect(viewer).toContain('groupEvidence');
  expect(viewer).toContain('preload="metadata"');
  expect(viewer).toContain('@media(max-width:760px)');
  expect(viewer).not.toContain('filePaths');
  const ksbIndex = fs.readFileSync('evia-evidence-ksb-index-v1.js','utf8');
  expect(ksbIndex).toContain('KSB Evidence Mapping.pdf');
  expect(ksbIndex).toContain('KSB Evidence Index');
  expect(ksbIndex).toContain('EV-${String(index+1).padStart(3');
  expect(ksbIndex).toContain('Naxos-Mapping_Engine/assessment-plans.json');
});