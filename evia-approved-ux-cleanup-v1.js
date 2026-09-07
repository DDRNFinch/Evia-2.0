(() => {
  'use strict';

  const NAXOS_ASSESSMENT_URL = 'https://ddrnfinch.github.io/Naxos-Mapping_Engine/assessment-plans.json';
  const QR_CACHE = 'evia-feature-lib-v1';
  const QR_LIBRARY_URL = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  const TARGETS_KEY = 'eviaMilosTargetsV1';
  const EPA_CONFIDENCE_KEY = 'eviaEpaConfidenceV1';
  const EPA_PRACTICE_KEY = 'eviaEpaPracticeV1';
  let assessmentCatalog = null;
  let assessmentCatalogPromise = null;
  let epaReplay = false;
  let epaLoading = false;
  let lastAssessmentPlan = null;
  let refreshQueued = false;

  const safeJson = (value, fallback) => {
    try { const parsed = JSON.parse(value); return parsed ?? fallback; } catch (error) { return fallback; }
  };
  const clean = (value) => String(value ?? '').trim();
  const finite = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const rounded = (value, places = 1) => {
    const number = finite(value);
    if (number === null) return null;
    const factor = 10 ** places;
    return Math.round(number * factor) / factor;
  };
  const escapeHtml = (value) => clean(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  function injectStyles() {
    if (document.getElementById('eviaUxCleanupV1Styles')) return;
    const style = document.createElement('style');
    style.id = 'eviaUxCleanupV1Styles';
    style.textContent = `
      .evia-clean-attend,.evia-clean-learn{display:flex!important;flex-direction:column!important;gap:10px!important}
      .evia-clean-attend>.detail-card,.evia-clean-attend>.detail-metrics,.evia-clean-attend>div,
      .evia-clean-learn>.detail-card,.evia-clean-learn>.detail-metrics,.evia-clean-learn>div{margin-top:0!important;margin-bottom:0!important}
      .evia-clean-attend .detail-metrics,.evia-clean-learn .detail-metrics{gap:8px!important}
      .evia-clean-attend .detail-metric{min-height:82px!important;padding:12px 8px!important;border-radius:19px!important}
      .evia-clean-attend .detail-metric strong{font-size:17px!important;line-height:1.12!important}
      .evia-clean-attend .detail-metric span{font-size:10px!important;line-height:1.25!important;margin-top:5px!important}
      .evia-clean-attend .detail-card{padding:13px 15px!important;border-radius:19px!important;box-shadow:0 6px 17px rgba(35,35,35,.035)!important}
      .evia-clean-attend .detail-card>strong{font-size:14px!important}
      .evia-clean-attend .detail-card p{font-size:10.8px!important;line-height:1.42!important;margin-top:5px!important}
      .evia-clean-attend button:not(.arch-detail-back){min-height:46px!important;border-radius:19px!important;padding:9px 12px!important;box-shadow:0 5px 14px rgba(35,35,35,.035)!important}
      .evia-clean-attend .learn-action-grid,.evia-clean-attend .detail-action-grid,.evia-clean-attend [class*="action-grid"]{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}
      .evia-clean-learn .detail-card{padding:13px 15px!important;border-radius:19px!important;box-shadow:0 6px 17px rgba(35,35,35,.035)!important}
      .evia-clean-learn .detail-card>strong{font-size:14px!important}
      .evia-clean-learn .detail-card p{font-size:10.8px!important;line-height:1.42!important;margin-top:5px!important}
      .evia-clean-learn .detail-metrics{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      .evia-clean-learn .detail-metric{min-height:68px!important;padding:9px 7px!important;border-radius:17px!important}
      .evia-clean-learn .detail-metric strong{font-size:15px!important}
      .evia-clean-learn .detail-metric span{font-size:9.5px!important;line-height:1.22!important;margin-top:3px!important}
      .evia-clean-learn .learn-action-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;margin-top:0!important}
      .evia-clean-learn .learn-action-grid button{min-height:58px!important;padding:10px!important;border-radius:19px!important}
      .evia-assistant-key{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;padding:7px 9px;margin-top:8px;border-top:1px solid rgba(45,45,45,.055);font-size:9.5px;color:rgba(45,45,45,.58)}
      .evia-assistant-key>strong{font-size:9.5px;color:rgba(45,45,45,.62);font-weight:750}
      .evia-assistant-key-item{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
      .evia-assistant-key-dot{width:7px;height:7px;border-radius:50%;display:inline-block;flex:0 0 7px}
      .evia-assistant-key-dot.milos{background:#2f80ed}.evia-assistant-key-dot.symi{background:#35a566}.evia-assistant-key-dot.tinos{background:#e9871b}
      .evia-shared-qr-card{text-align:center}.evia-shared-qr-wrap{width:min(76vw,300px);min-height:min(76vw,300px);margin:10px auto 4px;display:grid;place-items:center;background:#fff;border-radius:18px;padding:10px}
      .evia-shared-qr-wrap canvas,.evia-shared-qr-wrap img,.evia-shared-qr-wrap svg{max-width:100%;height:auto}
      .evia-shared-qr-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}
      .evia-shared-qr-metric{padding:8px 5px;border:1px solid rgba(245,196,0,.18);border-radius:15px;background:rgba(250,249,242,.72);text-align:center}
      .evia-shared-qr-metric strong{display:block;font-size:13px;color:#444}.evia-shared-qr-metric span{display:block;margin-top:3px;font-size:8.5px;line-height:1.2;color:#747474}
      .evia-epa-plan-summary{margin-top:8px!important}.evia-epa-plan-source{display:block;margin-top:8px;font-size:9.5px;line-height:1.4;color:#777}
      @media(max-width:390px){.evia-clean-attend .detail-card,.evia-clean-learn .detail-card{padding:12px 13px!important}.evia-assistant-key{gap:8px}.evia-shared-qr-summary{gap:5px}}
    `;
    document.head.appendChild(style);
  }

  function currentMeta() {
    try { if (typeof inferredCourseMeta === 'function') return inferredCourseMeta() || {}; } catch (error) {}
    try { return activeCourseMeta || {}; } catch (error) { return {}; }
  }

  function currentCourseId() {
    const meta = currentMeta();
    return clean(meta?.qualificationId || meta?.standardId || meta?.qualification?.id || meta?.id);
  }

  function currentCourseVersion() {
    const meta = currentMeta();
    return clean(meta?.version || meta?.qualification?.version);
  }

  function currentCourseTitle() {
    try { if (typeof activeCourseTitle !== 'undefined' && clean(activeCourseTitle)) return clean(activeCourseTitle); } catch (error) {}
    const meta = currentMeta();
    return clean(meta?.title || meta?.qualification?.title || 'Your course');
  }

  function activeDetailTitle() {
    try { return clean(archDetailTitle?.textContent); } catch (error) { return ''; }
  }

  function removeNisiaAttendControl(root) {
    const controls = [...root.querySelectorAll('button,[role="button"]')];
    controls.forEach((control) => {
      if (!/\bnisia\b/i.test(clean(control.textContent))) return;
      const parent = control.parentElement;
      control.remove();
      if (parent && parent !== root && !parent.querySelector('button,[role="button"]') && !clean(parent.textContent)) parent.remove();
    });
  }

  function cleanAttendUi() {
    let root = null;
    try { root = archDetailContent; } catch (error) { return; }
    if (!root || activeDetailTitle() !== 'Attend') return;
    root.classList.add('evia-clean-attend');
    root.classList.remove('evia-clean-learn');
    removeNisiaAttendControl(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      node.nodeValue = String(node.nodeValue || '')
        .replace(/College OTJ\/GLH learning hours received with attendance data\./gi, 'College Learning Hours received with attendance data.')
        .replace(/College OTJ learning hours received with attendance data\./gi, 'College Learning Hours received with attendance data.')
        .replace(/College GLH learning hours received with attendance data\./gi, 'College Learning Hours received with attendance data.');
    });
  }

  function cleanLearnUi() {
    let root = null;
    try { root = archDetailContent; } catch (error) { return; }
    if (!root || activeDetailTitle() !== 'Learn') return;
    root.classList.add('evia-clean-learn');
    root.classList.remove('evia-clean-attend');
    const catchup = root.querySelector('#openLearnCatchup');
    const ideas = root.querySelector('#openOtjIdeas');
    const shorten = (button, label, description) => {
      if (!button) return;
      const strong = button.querySelector('strong');
      const small = button.querySelector('span,small,p');
      if (strong) strong.textContent = label;
      if (small && small !== strong) small.textContent = description;
    };
    shorten(catchup, 'Catch Up', 'Add learning time from completed evidence.');
    shorten(ideas, 'Learning ideas', 'Find useful learning areas and add time.');
  }

  function appendAssistantKey() {
    let root = null;
    try { root = archDetailContent; } catch (error) { return; }
    if (!root || activeDetailTitle() !== 'Course') return;
    if (root.querySelector('#eviaAssistantReferenceKey')) return;
    const key = document.createElement('div');
    key.id = 'eviaAssistantReferenceKey';
    key.className = 'evia-assistant-key';
    key.setAttribute('aria-label', 'Assistant reference key');
    key.innerHTML = `
      <strong>Reference key</strong>
      <span class="evia-assistant-key-item"><i class="evia-assistant-key-dot milos" aria-hidden="true"></i>Milos</span>
      <span class="evia-assistant-key-item"><i class="evia-assistant-key-dot symi" aria-hidden="true"></i>Symi</span>
      <span class="evia-assistant-key-item"><i class="evia-assistant-key-dot tinos" aria-hidden="true"></i>Tinos</span>`;
    root.appendChild(key);
  }

  function confidencePercent() {
    const state = safeJson(localStorage.getItem(EPA_CONFIDENCE_KEY) || '{}', {});
    const values = Object.values(state && typeof state === 'object' ? state : {})
      .map((item) => finite(item?.value)).filter((value) => value !== null);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  function practicePercent() {
    const state = safeJson(localStorage.getItem(EPA_PRACTICE_KEY) || '{}', {});
    return finite(state?.percent);
  }

  function targetFigures() {
    const state = safeJson(localStorage.getItem(TARGETS_KEY) || '[]', []);
    const list = Array.isArray(state) ? state : [];
    const done = list.filter((target) => {
      const status = clean(target?.status).toLowerCase();
      return target?.completed === true || target?.complete === true || ['complete','completed','done','achieved'].includes(status);
    }).length;
    return { total:list.length, completed:done, outstanding:Math.max(0, list.length - done) };
  }

  async function buildSharedFiguresPayload() {
    let attendance = {};
    try { if (typeof loadAttendanceData === 'function') attendance = loadAttendanceData() || {}; } catch (error) {}
    let combinedAttendance = null;
    try { if (typeof combinedAttendancePercent === 'function') combinedAttendance = combinedAttendancePercent(attendance); } catch (error) {}
    let elapsed = null;
    try { if (typeof courseProgressPercent === 'function') elapsed = courseProgressPercent(); } catch (error) {}
    let course = { completed:null, total:null, percent:null };
    try { if (typeof completedCourseProgress === 'function') course = completedCourseProgress() || course; } catch (error) {}
    let required = null;
    try { if (typeof totalLearningRequirement === 'function') required = totalLearningRequirement(); } catch (error) {}
    let learnerHours = 0;
    try { if (typeof learnerLearningHours === 'function') learnerHours = finite(learnerLearningHours()) ?? 0; } catch (error) {}
    const collegeHours = finite(attendance?.collegeLearningHours) ?? 0;
    const totalHours = learnerHours + collegeHours;
    const learningPercent = finite(required) && Number(required) > 0 ? Math.min(100, (totalHours / Number(required)) * 100) : null;
    let learningEntryCount = null;
    try { if (typeof learningEntries !== 'undefined' && Array.isArray(learningEntries)) learningEntryCount = learningEntries.length; } catch (error) {}
    let evidenceCount = null;
    try {
      if (typeof getPortfolioEntries === 'function') {
        const entries = await getPortfolioEntries();
        if (Array.isArray(entries)) evidenceCount = entries.length;
      }
    } catch (error) {}
    const confidence = confidencePercent();
    const practice = practicePercent();
    const coursePercent = finite(course?.percent);
    const readinessParts = [coursePercent, confidence, practice].filter((value) => value !== null);
    const readiness = readinessParts.length ? readinessParts.reduce((sum, value) => sum + value, 0) / readinessParts.length : null;
    const targets = targetFigures();
    const meta = currentMeta();

    return {
      type: 'evia-figures-share',
      version: 1,
      createdAt: new Date().toISOString(),
      course: {
        id: currentCourseId(),
        version: currentCourseVersion(),
        title: currentCourseTitle(),
        type: clean(meta?.courseType || meta?.type)
      },
      figures: {
        timeOnCoursePercent: rounded(elapsed),
        course: { completed:finite(course?.completed), total:finite(course?.total), percent:rounded(coursePercent) },
        attendance: {
          collegePercent: rounded(attendance?.college),
          workplacePercent: rounded(attendance?.workplace),
          combinedPercent: rounded(combinedAttendance)
        },
        learning: {
          requiredHours: rounded(required),
          collegeHours: rounded(collegeHours),
          learnerHours: rounded(learnerHours),
          totalHours: rounded(totalHours),
          percent: rounded(learningPercent),
          entries: finite(learningEntryCount)
        },
        evidence: { items: finite(evidenceCount) },
        targets,
        epa: { confidencePercent:rounded(confidence), practicePercent:rounded(practice), readinessPercent:rounded(readiness) }
      }
    };
  }

  async function ensureQrLibrary() {
    if (typeof QRCode === 'function') return true;
    try {
      let response = null;
      if ('caches' in window) {
        const cache = await caches.open(QR_CACHE);
        response = await cache.match(QR_LIBRARY_URL);
        if (!response) {
          const fetched = await fetch(QR_LIBRARY_URL, { mode:'cors', cache:'no-store' });
          if (fetched.ok) { await cache.put(QR_LIBRARY_URL, fetched.clone()); response = fetched; }
        }
      } else {
        response = await fetch(QR_LIBRARY_URL, { mode:'cors', cache:'force-cache' });
      }
      if (!response || !response.ok) return false;
      const source = await response.text();
      (0, eval)(source);
      return typeof QRCode === 'function';
    } catch (error) { return false; }
  }

  async function renderSharedFiguresQr() {
    try { naxosMenu?.classList.remove('open'); naxosArch?.setAttribute('aria-expanded','false'); } catch (error) {}
    try { if (typeof openArchShell === 'function') openArchShell('Share QR code'); } catch (error) { return; }
    try { archDetailStack = []; } catch (error) {}
    let root = null;
    try { root = archDetailContent; } catch (error) { return; }
    const payload = await buildSharedFiguresPayload();
    const coursePercent = payload.figures.course.percent;
    const attendancePercent = payload.figures.attendance.combinedPercent;
    const learningPercent = payload.figures.learning.percent;
    root.innerHTML = `
      <div class="detail-card">
        <strong>Share Evia figures</strong>
        <p>One QR shares the numbers and progress figures Evia currently tracks. Milos, Symi and Tinos can each use the parts they need.</p>
        <p class="detail-muted">No learner name, contact details, evidence files, evidence text or other profile information is included.</p>
        <div class="evia-shared-qr-summary">
          <div class="evia-shared-qr-metric"><strong>${coursePercent === null ? '--' : `${Math.round(coursePercent)}%`}</strong><span>course</span></div>
          <div class="evia-shared-qr-metric"><strong>${attendancePercent === null ? '--' : `${Math.round(attendancePercent)}%`}</strong><span>attendance</span></div>
          <div class="evia-shared-qr-metric"><strong>${learningPercent === null ? '--' : `${Math.round(learningPercent)}%`}</strong><span>Learning Hours</span></div>
        </div>
      </div>
      <div class="detail-card evia-shared-qr-card">
        <div class="evia-shared-qr-wrap" id="eviaSharedFiguresQr"></div>
        <p class="detail-muted" id="eviaSharedFiguresQrStatus">Preparing QR…</p>
      </div>`;
    const wrap = document.getElementById('eviaSharedFiguresQr');
    const status = document.getElementById('eviaSharedFiguresQrStatus');
    const ready = await ensureQrLibrary();
    if (!ready) { if (status) status.textContent = 'QR generation is unavailable on this device right now.'; return; }
    const text = JSON.stringify(payload);
    try {
      wrap.innerHTML = '';
      new QRCode(wrap, { text, width:292, height:292, correctLevel:QRCode.CorrectLevel.L });
      if (status) status.textContent = 'One QR · shared figures only';
    } catch (error) {
      if (status) status.textContent = 'The figures could not be prepared as one QR.';
    }
  }

  function isShareQrControl(target) {
    const button = target?.closest?.('button,[role="button"]');
    if (!button) return null;
    if (button.dataset?.naxosAction === 'send') return button;
    const inNaxos = button.closest('#naxosMenu,.naxos-menu,[data-naxos-menu]');
    if (inNaxos && /share\s*(qr|with)/i.test(clean(button.textContent))) return button;
    return null;
  }

  async function loadAssessmentCatalog() {
    if (assessmentCatalog) return assessmentCatalog;
    if (assessmentCatalogPromise) return assessmentCatalogPromise;
    assessmentCatalogPromise = (async () => {
      let response = null;
      try { response = await fetch(NAXOS_ASSESSMENT_URL, { cache:'no-store' }); } catch (error) {}
      if ((!response || !response.ok) && 'caches' in window) {
        try { response = await caches.match(NAXOS_ASSESSMENT_URL); } catch (error) {}
      }
      if (!response || !response.ok) return null;
      const data = await response.json();
      assessmentCatalog = data && typeof data === 'object' ? data : null;
      return assessmentCatalog;
    })();
    try { return await assessmentCatalogPromise; } finally { assessmentCatalogPromise = null; }
  }

  async function assessmentPlanForCurrentCourse() {
    const id = currentCourseId();
    if (!id) return null;
    const catalog = await loadAssessmentCatalog();
    const courses = catalog?.courses;
    if (!courses || typeof courses !== 'object') return null;
    const direct = courses[id];
    if (direct) return direct;
    const base = id.replace(/-(SITE|AJ)$/i, '');
    return courses[base] || null;
  }

  function mergeAssessmentPlan(plan) {
    if (!plan) return;
    const meta = currentMeta();
    const methods = Array.isArray(plan.methods) ? plan.methods.map((item) => ({
      title:clean(item?.title || item?.name),
      description:clean(item?.detail || item?.description)
    })).filter((item) => item.title) : [];
    const merged = {
      ...meta,
      assessmentMethods: methods,
      assessmentPlanVersion: clean(plan.planVersion),
      assessmentPlan: {
        ...(meta?.assessmentPlan && typeof meta.assessmentPlan === 'object' ? meta.assessmentPlan : {}),
        version:clean(plan.planVersion),
        source:clean(plan.source),
        sourceUrl:clean(plan.sourceUrl),
        typicalAssessmentPeriodMonths:finite(plan.typicalAssessmentPeriodMonths),
        overallGrades:Array.isArray(plan.overallGrades) ? plan.overallGrades.slice() : [],
        methods
      }
    };
    try {
      if (typeof saveCourseMeta === 'function') saveCourseMeta(merged);
      else activeCourseMeta = merged;
    } catch (error) {
      try { activeCourseMeta = merged; } catch (ignored) {}
    }
  }

  function enhanceAssessmentPlanCard() {
    const plan = lastAssessmentPlan;
    if (!plan) return;
    const title = document.getElementById('eviaSupportTitle');
    const content = document.getElementById('eviaSupportContent');
    if (!content || clean(title?.textContent) !== 'My EPA') return;
    const cards = [...content.querySelectorAll('.evia-epa-card')];
    const planCard = cards.find((card) => /my assessment plan/i.test(clean(card.querySelector(':scope > strong')?.textContent)));
    if (!planCard || planCard.dataset.naxosEnhanced === '1') return;
    planCard.dataset.naxosEnhanced = '1';
    const methods = Array.isArray(plan.methods) ? plan.methods : [];
    const grades = Array.isArray(plan.overallGrades) ? plan.overallGrades.map(clean).filter(Boolean) : [];
    const period = finite(plan.typicalAssessmentPeriodMonths);
    const existingChecks = planCard.querySelector('.evia-epa-checks');
    if (existingChecks) {
      if (period !== null) existingChecks.insertAdjacentHTML('beforeend', `<div class="evia-epa-check"><span>Typical EPA period</span><span class="evia-epa-status">${escapeHtml(period)} months</span></div>`);
      existingChecks.insertAdjacentHTML('beforeend', `<div class="evia-epa-check"><span>Assessment methods</span><span class="evia-epa-status">${methods.length}</span></div>`);
      if (grades.length) existingChecks.insertAdjacentHTML('beforeend', `<div class="evia-epa-check"><span>Overall grades</span><span class="evia-epa-status">${escapeHtml(grades.join(' · '))}</span></div>`);
    }
    if (clean(plan.source)) planCard.insertAdjacentHTML('beforeend', `<span class="evia-epa-plan-source">Source: ${escapeHtml(plan.source)}</span>`);
  }

  async function hydrateAndReplayEpa(button) {
    if (epaLoading) return;
    epaLoading = true;
    try {
      const plan = await assessmentPlanForCurrentCourse();
      if (plan) { lastAssessmentPlan = plan; mergeAssessmentPlan(plan); }
    } catch (error) {
      lastAssessmentPlan = null;
    } finally {
      epaLoading = false;
      epaReplay = true;
      try { button.click(); } finally { setTimeout(() => { epaReplay = false; enhanceAssessmentPlanCard(); }, 0); }
    }
  }

  function handleCaptureClick(event) {
    const share = isShareQrControl(event.target);
    if (share) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      renderSharedFiguresQr().catch(() => {});
      return;
    }
    const epa = event.target?.closest?.('[data-evia-tool="epa"]');
    if (!epa || epaReplay) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    hydrateAndReplayEpa(epa);
  }

  function refreshVisibleUi() {
    refreshQueued = false;
    const title = activeDetailTitle();
    let root = null;
    try { root = archDetailContent; } catch (error) {}
    if (root && title !== 'Attend') root.classList.remove('evia-clean-attend');
    if (root && title !== 'Learn') root.classList.remove('evia-clean-learn');
    if (title === 'Attend') cleanAttendUi();
    else if (title === 'Learn') cleanLearnUi();
    else if (title === 'Course') appendAssistantKey();
    enhanceAssessmentPlanCard();
  }

  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(refreshVisibleUi);
  }

  function installObservers() {
    const roots = [];
    try { if (archDetailContent) roots.push(archDetailContent); } catch (error) {}
    const support = document.getElementById('eviaSupportContent');
    if (support) roots.push(support);
    if (!roots.length) return;
    const observer = new MutationObserver(queueRefresh);
    roots.forEach((root) => observer.observe(root, { childList:true, subtree:true, characterData:true }));
  }

  injectStyles();
  document.addEventListener('click', handleCaptureClick, true);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { installObservers(); queueRefresh(); }, { once:true });
  } else {
    installObservers(); queueRefresh();
  }
})();
