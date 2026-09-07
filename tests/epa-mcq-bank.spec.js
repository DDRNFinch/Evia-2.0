const { test, expect } = require('@playwright/test');

async function bootControlled(context, app) {
  await app.goto('/evia-release.json', { waitUntil: 'domcontentloaded' });
  await app.evaluate(async () => {
    const marker = await caches.open('evia-update-ui-ready-v1');
    const releaseUrl = new URL('/__evia-visible-release-version__', location.origin).href;
    await marker.put(releaseUrl, new Response('__smoke_previous_release__', { headers: { 'content-type': 'text/plain' } }));
  });
  const workerStarted = context.serviceWorkers().length ? Promise.resolve(context.serviceWorkers()[0]) : context.waitForEvent('serviceworker', { timeout: 15000 }).catch(() => null);
  await app.goto('/?__evia_epa_mcq_bank_smoke=1', { waitUntil: 'domcontentloaded' });
  await expect(app.locator('#eviaStage')).toBeVisible();
  const firstWorker = await workerStarted;
  expect(firstWorker || context.serviceWorkers()[0]).toBeTruthy();
  const ready = await app.evaluate(async () => navigator.serviceWorker ? Promise.race([navigator.serviceWorker.ready.then(registration => Boolean(registration.active)), new Promise(resolve => setTimeout(() => resolve(false), 20000))]) : false);
  expect(ready).toBeTruthy();
  await expect.poll(async () => app.evaluate(() => Boolean(navigator.serviceWorker?.controller)).catch(() => false), { timeout: 10000, intervals: [100, 250, 500, 1000] }).toBeTruthy();
  await app.reload({ waitUntil: 'domcontentloaded' });
  await expect(app.locator('#eviaStage')).toBeVisible();
}

function seedCourse() {
  localStorage.clear();
  localStorage.setItem('eviaDemoModeV1', '0');
  const bankUrl = 'https://ddrnfinch.github.io/Naxos-Mapping_Engine/question-banks/ST0095-epa-v1.json';
  const course = [{ label:'Brickwork', children:[{ label:'K1 · Health and safety', requirements:'Explain safe working requirements.', ksbTargets:['K1'], recommended:{label:'Written',type:'text',details:[]} }] }];
  const meta = {
    courseType:'ksb', qualificationId:'ST0095', title:'Bricklayer — ST0095 v1.2',
    officialItems:{ K1:'Health and safety requirements.' },
    mappings:{ K1:[['Brickwork','K1 · Health and safety']] }, ksbOrder:['K1'],
    questionBank:{ schemaVersion:1, source:'Naxos', epa:bankUrl }
  };
  localStorage.setItem('eviaNaxosCourse', JSON.stringify(course));
  localStorage.setItem('eviaNaxosCourseTitle', 'Bricklayer — ST0095 v1.2');
  localStorage.setItem('eviaNaxosCourseMetaV1', JSON.stringify(meta));
}

function bankBody() {
  return {
    naxosQuestionBank:1, schemaVersion:1, bankId:'ST0095-epa-v1', version:4, category:'epa', courseId:'ST0095', questionCount:6,
    questions:Array.from({ length:6 }, (_, i) => ({
      id:`ST0095-EPA-LOCAL-${i+1}`, category:'epa', courseId:'ST0095',
      question:`Naxos local EPA scenario ${i+1}: choose the strongest occupational response.`,
      answers:['Strongest response','Plausible response','Weak response','Unsafe response'],
      correct:0, explanation:'The strongest response follows the mapped approved requirement.',
      difficulty:i < 4 ? 'stretch' : 'competent', mappings:['K1'], active:true, sourceRef:'K1'
    }))
  };
}

test('EPA MCQ starts from the Naxos course bank without waiting for Workers AI generation', async ({ page, context }) => {
  let workerMcqCalls = 0;
  await context.addInitScript(seedCourse);
  await context.route('https://ddrnfinch.github.io/Naxos-Mapping_Engine/assessment-plans.json', route => route.fulfill({
    status:200, contentType:'application/json', body:JSON.stringify({ courses:{ ST0095:{ title:'Bricklayer — ST0095 v1.2', methods:[
      { title:'Multiple-choice test', detail:'40 multiple-choice questions · 60 minutes · closed book.' },
      { title:'Interview underpinned by a portfolio of evidence', detail:'60-minute interview · at least 10 questions.' },
      { title:'Practical assessment with questions', detail:'12-hour practical assessment · at least 6 questions.' }
    ] } } })
  }));
  await context.route('https://ddrnfinch.github.io/Naxos-Mapping_Engine/question-banks/ST0095-epa-v1.json', route => route.fulfill({
    status:200, contentType:'application/json', body:JSON.stringify(bankBody())
  }));
  await context.route('https://evia-teach-test.finchyisnow.workers.dev/v1/epa-discussion', async route => {
    const request = route.request();
    if ((request.headers()['content-type'] || '').includes('application/json')) {
      const body = request.postDataJSON();
      if (body.action === 'mcq') workerMcqCalls += 1;
    }
    await route.fulfill({ status:500, contentType:'application/json', body:JSON.stringify({ ok:false, error:'MCQ should not reach Workers AI when the Naxos bank is available.' }) });
  });

  await bootControlled(context, page);
  await page.locator('#naxosArch').click();
  await page.locator('#eviaPlusMenu .evia-plus-pill', { hasText:'EPA Practice' }).click();
  await expect(page.locator('#epaV2Panel [data-epa-method="mcq"]')).toBeVisible({ timeout:5000 });
  await page.locator('#epaV2Panel [data-epa-method="mcq"]').click();
  await page.locator('#eviaEpaReadyV2').click();

  const question = page.locator('.epa-v2-q');
  await expect(question).toBeVisible({ timeout:5000 });
  await expect(question).not.toHaveText('');
  await expect(page.locator('#epaV2Panel [data-a]')).toHaveCount(4);
  // The Worker is deliberately configured to fail in this test. A displayed MCQ
  // with zero Worker MCQ calls therefore proves EPA used the Naxos course bank.
  expect(workerMcqCalls).toBe(0);
});
