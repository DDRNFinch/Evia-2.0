(() => {
  'use strict';

  const YELLOW = '#f5c400';
  const TARGETS_KEY = 'eviaMilosTargetsV1';
  const EPA_CONFIDENCE_KEY = 'eviaEpaConfidenceV1';
  const EPA_PRACTICE_KEY = 'eviaEpaPracticeV1';
  const EPA_FORMAL_KEY = 'eviaMilosEpaReadinessV1';

  function safeJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function clean(value) {
    return String(value ?? '').trim();
  }

  function escapeHtml(value) {
    return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  function fmtPercent(value) {
    if (value === null || value === undefined || value === '') return '--';
    const n = Number(value);
    return Number.isFinite(n) ? `${Math.max(0, Math.min(100, Math.round(n)))}%` : '--';
  }

  function svgIcon(type) {
    const common = `fill="none" stroke="${YELLOW}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
    if (type === 'target') return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle ${common} cx="12" cy="12" r="8"/><circle ${common} cx="12" cy="12" r="4"/><path ${common} d="M14.8 9.2 20 4m0 0h-3m3 0v3"/></svg>`;
    if (type === 'profile') return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle ${common} cx="12" cy="8" r="3.3"/><path ${common} d="M5.5 19c.9-4 3.1-6 6.5-6s5.6 2 6.5 6"/></svg>`;
    if (type === 'settings') return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle ${common} cx="12" cy="12" r="3"/><path ${common} d="M12 3.8v2M12 18.2v2M3.8 12h2M18.2 12h2M6.2 6.2l1.4 1.4m8.8 8.8 1.4 1.4m0-11.6-1.4 1.4m-8.8 8.8-1.4 1.4"/></svg>`;
    return '';
  }

  function miniEviaIcon() {
    return '<span class="evia-menu-mini" aria-hidden="true"><span class="evia-menu-mini-eye"></span><span class="evia-menu-mini-eye"></span></span>';
  }

  function epaRingIcon() {
    return '<span class="evia-epa-menu-ring" aria-hidden="true">EPA</span>';
  }

  function injectStyles() {
    if (document.getElementById('eviaEpaPlanStyles')) return;
    const style = document.createElement('style');
    style.id = 'eviaEpaPlanStyles';
    style.textContent = `
      #eviaToolsMenu.evia-tools-menu{
        right:max(8px,env(safe-area-inset-right))!important;
        width:58px!important;
        padding:6px!important;
        border-radius:25px!important;
        gap:6px!important;
        align-items:center!important;
      }
      #eviaToolsMenu .evia-tool-item{
        width:46px!important;
        min-height:46px!important;
        height:46px!important;
        padding:0!important;
        border-radius:18px!important;
        justify-content:center!important;
        gap:0!important;
      }
      #eviaToolsMenu .evia-tool-icon{
        width:30px!important;
        height:30px!important;
        flex:0 0 30px!important;
      }
      #eviaToolsMenu .evia-tool-icon svg{width:27px!important;height:27px!important}
      #eviaToolsMenu .evia-menu-mini{width:29px!important;height:29px!important}
      .evia-epa-menu-ring{
        width:29px;height:29px;border:1.8px solid ${YELLOW};border-radius:50%;display:grid;place-items:center;
        color:${YELLOW}!important;font-size:8px!important;font-weight:800!important;letter-spacing:.03em;line-height:1;
        box-shadow:0 0 10px rgba(245,196,0,.12)
      }
      .evia-epa-hero{display:flex;align-items:center;gap:14px;border:1.5px solid rgba(245,196,0,.28);border-radius:26px;background:linear-gradient(180deg,#fff,rgba(250,249,242,.94));box-shadow:0 8px 22px rgba(0,0,0,.035);padding:16px;margin-bottom:11px}
      .evia-epa-ring-large{width:76px;height:76px;border:4px solid ${YELLOW};border-radius:50%;display:grid;place-items:center;flex:0 0 76px;color:#333;font-size:19px;font-weight:800;box-shadow:0 0 18px rgba(245,196,0,.12)}
      .evia-epa-hero-copy{min-width:0}.evia-epa-hero-copy strong{display:block;font-size:18px;color:#333}.evia-epa-hero-copy span{display:block;margin-top:4px;font-size:11px;line-height:1.4;color:#666}
      .evia-epa-card{border:1.5px solid rgba(245,196,0,.25);border-radius:24px;background:linear-gradient(180deg,#fff,rgba(250,249,242,.94));box-shadow:0 8px 22px rgba(0,0,0,.035);padding:16px;margin-bottom:11px}
      .evia-epa-card>strong{font-size:15px;color:#333}.evia-epa-card>p{font-size:11.5px;line-height:1.5;color:#5c5c5c;margin-top:6px}
      .evia-epa-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:11px}
      .evia-epa-metric{min-height:76px;border:1px solid rgba(245,196,0,.18);border-radius:17px;background:rgba(255,255,255,.78);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8px}
      .evia-epa-metric strong{font-size:17px;color:#333}.evia-epa-metric span{margin-top:4px;font-size:9.5px;line-height:1.25;color:#6b6b6b}
      .evia-epa-checks{display:flex;flex-direction:column;gap:8px;margin-top:11px}.evia-epa-check{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid rgba(45,45,45,.06);font-size:11.5px;color:#555}.evia-epa-check:first-child{border-top:0}.evia-epa-status{font-size:10px;font-weight:700;color:#555;text-align:right}.evia-epa-status.good{color:#806600}
      .evia-epa-method{padding:10px 0;border-top:1px solid rgba(45,45,45,.06)}.evia-epa-method:first-of-type{border-top:0}.evia-epa-method strong{display:block;font-size:12.5px;color:#444}.evia-epa-method span{display:block;margin-top:3px;font-size:10.5px;line-height:1.4;color:#686868}
      .evia-epa-weak{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.evia-epa-weak span{padding:6px 9px;border-radius:999px;background:rgba(245,196,0,.12);font-size:10px;color:#555}
      .evia-epa-note{font-size:10px!important;color:#707070!important}
    `;
    document.head.appendChild(style);
  }

  function installIconMenu() {
    const menu = document.getElementById('eviaToolsMenu');
    if (!menu || menu.dataset.epaIconMenu === '1') return;
    menu.dataset.epaIconMenu = '1';
    menu.innerHTML = `
      <button class="evia-tool-item" type="button" data-evia-tool="chat" aria-label="Chat with Evia" title="Chat with Evia"><span class="evia-tool-icon">${miniEviaIcon()}</span></button>
      <button class="evia-tool-item" type="button" data-evia-tool="targets" aria-label="Targets" title="Targets"><span class="evia-tool-icon">${svgIcon('target')}</span></button>
      <button class="evia-tool-item" type="button" data-evia-tool="profile" aria-label="Learner Profile" title="Learner Profile"><span class="evia-tool-icon">${svgIcon('profile')}</span></button>
      <button class="evia-tool-item" type="button" data-evia-tool="epa" aria-label="My EPA" title="My EPA"><span class="evia-tool-icon">${epaRingIcon()}</span></button>
      <button class="evia-tool-item" type="button" data-evia-tool="settings" aria-label="Settings" title="Settings"><span class="evia-tool-icon">${svgIcon('settings')}</span></button>`;
    menu.addEventListener('click', (event) => {
      const button = event.target.closest('[data-evia-tool="epa"]');
      if (!button) return;
      openEpaPlan();
    });
  }

  function courseMeta() {
    try {
      if (typeof inferredCourseMeta === 'function') return inferredCourseMeta() || {};
    } catch (error) {}
    try { return activeCourseMeta || {}; } catch (error) { return {}; }
  }

  function courseCoverage() {
    try {
      const progress = typeof completedCourseProgress === 'function' ? completedCourseProgress() : null;
      const value = progress?.percent;
      return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
    } catch (error) {
      return null;
    }
  }

  function confidenceSummary() {
    const state = safeJson(EPA_CONFIDENCE_KEY, {});
    const rows = Object.entries(state && typeof state === 'object' ? state : {})
      .filter(([, value]) => value?.value !== null && value?.value !== undefined && value?.value !== '')
      .map(([key, value]) => ({ key, value: Number(value.value) }))
      .filter((row) => Number.isFinite(row.value));
    if (!rows.length) return { percent:null, weak:[] };
    const percent = rows.reduce((sum, row) => sum + row.value, 0) / rows.length;
    const weak = rows
      .filter((row) => row.value < 75)
      .sort((a,b) => a.value - b.value)
      .slice(0,3)
      .map((row) => clean(row.key.split('›').pop()) || row.key);
    return { percent, weak };
  }

  function practiceSummary() {
    const state = safeJson(EPA_PRACTICE_KEY, {});
    const raw = state?.percent;
    const percent = raw !== null && raw !== undefined && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : null;
    return { percent, completedAt:clean(state?.completedAt) };
  }

  function learningSummary() {
    let required = null, total = null;
    try { required = typeof totalLearningRequirement === 'function' ? totalLearningRequirement() : null; } catch (error) {}
    try {
      const learner = typeof learnerLearningHours === 'function' ? learnerLearningHours() : 0;
      const college = typeof loadAttendanceData === 'function' ? Number(loadAttendanceData()?.collegeLearningHours || 0) : 0;
      total = Number(learner || 0) + Number(college || 0);
    } catch (error) {}
    const percent = Number(required) > 0 && Number.isFinite(Number(total)) ? Math.min(100, (Number(total) / Number(required)) * 100) : null;
    return { required:Number(required) > 0 ? Number(required) : null, total:Number.isFinite(Number(total)) ? Number(total) : null, percent };
  }

  function targetSummary() {
    const targets = safeJson(TARGETS_KEY, []);
    const list = Array.isArray(targets) ? targets : [];
    const isDone = (target) => {
      const status = clean(target?.status).toLowerCase();
      return target?.completed === true || target?.complete === true || ['complete','completed','done','achieved'].includes(status);
    };
    return { total:list.length, outstanding:list.filter((target) => !isDone(target)).length };
  }

  function formalReadiness() {
    const value = safeJson(EPA_FORMAL_KEY, null);
    if (!value || typeof value !== 'object') return { label:'Not confirmed yet', good:false };
    const status = clean(value.status || value.readiness || value.outcome);
    if (!status) return { label:'Not confirmed yet', good:false };
    return { label:status, good:/ready|approved|confirmed/i.test(status) && !/not|pending/i.test(status) };
  }

  function readinessSummary() {
    const coverage = courseCoverage();
    const confidence = confidenceSummary();
    const practice = practiceSummary();
    const values = [coverage, confidence.percent, practice.percent].filter((value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)));
    return {
      percent:values.length ? values.reduce((sum,value) => sum + Number(value), 0) / values.length : null,
      coverage,
      confidence:confidence.percent,
      practice:practice.percent,
      weak:confidence.weak
    };
  }

  function assessmentMethods(meta) {
    const candidates = [
      meta?.assessmentMethods,
      meta?.assessment?.methods,
      meta?.assessmentPlan?.methods,
      meta?.epa?.methods,
      meta?.qualification?.assessmentMethods,
      meta?.qualification?.assessment?.methods,
      meta?.qualification?.assessmentPlan?.methods
    ];
    const source = candidates.find((value) => Array.isArray(value) && value.length);
    if (!source) return [];
    return source.map((item) => {
      if (typeof item === 'string') return { title:clean(item), detail:'' };
      return {
        title:clean(item?.title || item?.name || item?.method || item?.type),
        detail:clean(item?.description || item?.detail || item?.summary || item?.whatHappens)
      };
    }).filter((item) => item.title);
  }

  function assessmentPlanVersion(meta) {
    return clean(
      meta?.assessmentPlanVersion || meta?.assessment?.planVersion || meta?.assessmentPlan?.version || meta?.epa?.planVersion ||
      meta?.qualification?.assessmentPlanVersion || meta?.qualification?.assessmentPlan?.version
    );
  }

  function openEpaPlan() {
    const overlay = document.getElementById('eviaSupportOverlay');
    const title = document.getElementById('eviaSupportTitle');
    const subtitle = document.getElementById('eviaSupportSubtitle');
    const content = document.getElementById('eviaSupportContent');
    if (!overlay || !title || !subtitle || !content) return;

    const meta = courseMeta();
    const readiness = readinessSummary();
    const learning = learningSummary();
    const targets = targetSummary();
    const formal = formalReadiness();
    const methods = assessmentMethods(meta);
    const planVersion = assessmentPlanVersion(meta);
    const courseTitle = clean((typeof activeCourseTitle !== 'undefined' ? activeCourseTitle : '') || meta?.title || meta?.qualification?.title || 'Your course');
    const courseId = clean(meta?.qualificationId || meta?.qualification?.id);
    const version = clean(meta?.version || meta?.qualification?.version);

    title.textContent = 'My EPA';
    subtitle.textContent = 'Assessment plan and readiness';

    const methodsHtml = methods.length
      ? methods.map((method) => `<div class="evia-epa-method"><strong>${escapeHtml(method.title)}</strong><span>${escapeHtml(method.detail || 'This assessment method is part of your course assessment plan.')}</span></div>`).join('')
      : '<p>Naxos has not supplied assessment methods for this course yet. When the course assessment-plan mapping is added, the actual methods will appear here.</p>';

    const weakHtml = readiness.weak.length
      ? `<div class="evia-epa-weak">${readiness.weak.map((area) => `<span>${escapeHtml(area)}</span>`).join('')}</div>`
      : '<p>No low-confidence areas have been identified from your check-ins yet.</p>';

    content.innerHTML = `
      <section class="evia-epa-hero">
        <div class="evia-epa-ring-large">${readiness.percent === null ? 'EPA' : escapeHtml(fmtPercent(readiness.percent))}</div>
        <div class="evia-epa-hero-copy"><strong>${readiness.percent === null ? 'Build your EPA picture' : 'EPA readiness'}</strong><span>${readiness.percent === null ? 'Use your course, confidence check-ins and EPA practice to build this readiness view.' : 'Based on course coverage, learner confidence and EPA practice.'}</span></div>
      </section>

      <section class="evia-epa-card"><strong>My readiness</strong>
        <div class="evia-epa-grid">
          <div class="evia-epa-metric"><strong>${fmtPercent(readiness.coverage)}</strong><span>course coverage</span></div>
          <div class="evia-epa-metric"><strong>${fmtPercent(readiness.confidence)}</strong><span>confidence</span></div>
          <div class="evia-epa-metric"><strong>${fmtPercent(readiness.practice)}</strong><span>EPA practice</span></div>
          <div class="evia-epa-metric"><strong>${fmtPercent(learning.percent)}</strong><span>Learning Hours</span></div>
        </div>
        <p class="evia-epa-note">This is a learner readiness indicator, not official gateway or assessment approval.</p>
      </section>

      <section class="evia-epa-card"><strong>Before assessment</strong>
        <div class="evia-epa-checks">
          <div class="evia-epa-check"><span>Course progress</span><span class="evia-epa-status${Number(readiness.coverage) >= 100 ? ' good' : ''}">${fmtPercent(readiness.coverage)}</span></div>
          <div class="evia-epa-check"><span>Learning Hours</span><span class="evia-epa-status${Number(learning.percent) >= 100 ? ' good' : ''}">${learning.required === null ? 'Waiting for Naxos' : `${Number(learning.total || 0).toFixed(1)} / ${learning.required.toFixed(1)}h`}</span></div>
          <div class="evia-epa-check"><span>Review targets</span><span class="evia-epa-status${targets.total && targets.outstanding === 0 ? ' good' : ''}">${targets.total ? `${targets.outstanding} outstanding` : 'None received yet'}</span></div>
          <div class="evia-epa-check"><span>Formal readiness</span><span class="evia-epa-status${formal.good ? ' good' : ''}">${escapeHtml(formal.label)}</span></div>
        </div>
      </section>

      <section class="evia-epa-card"><strong>How I'll be assessed</strong>${methodsHtml}</section>

      <section class="evia-epa-card"><strong>Areas to strengthen</strong>${weakHtml}<p>Use Teach Me, Test Me, your course tasks and review targets to work on these areas.</p></section>

      <section class="evia-epa-card"><strong>Assessment support</strong><p>Your Evia Learning Support settings can make day-to-day learning easier. Any formal reasonable adjustment for assessment must be agreed through your provider and assessment organisation.</p></section>

      <section class="evia-epa-card"><strong>My assessment plan</strong>
        <div class="evia-epa-checks">
          <div class="evia-epa-check"><span>Course</span><span class="evia-epa-status">${escapeHtml(courseTitle)}</span></div>
          ${courseId ? `<div class="evia-epa-check"><span>Course ID</span><span class="evia-epa-status">${escapeHtml(courseId)}</span></div>` : ''}
          ${version ? `<div class="evia-epa-check"><span>Course version</span><span class="evia-epa-status">${escapeHtml(version)}</span></div>` : ''}
          <div class="evia-epa-check"><span>Assessment-plan version</span><span class="evia-epa-status">${escapeHtml(planVersion || 'Waiting for Naxos')}</span></div>
        </div>
      </section>`;

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    content.scrollTop = 0;
  }

  injectStyles();
  installIconMenu();
})();
