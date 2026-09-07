(() => {
  'use strict';

  const EMPLOYER_STATE_KEY = 'eviaEmployerConfirmationsV1';
  const EPA_CONFIDENCE_KEY = 'eviaEpaConfidenceV1';
  const EPA_PRACTICE_KEY = 'eviaEpaPracticeV1';
  const QR_CACHE = 'evia-feature-lib-v1';
  const QR_LIBRARY_URL = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';

  const safeJsonParse = (value, fallback = null) => {
    try { return JSON.parse(value); } catch (error) { return fallback; }
  };

  const readEmployerState = () => {
    const state = safeJsonParse(localStorage.getItem(EMPLOYER_STATE_KEY) || '{}', {});
    return {
      targets: state && typeof state.targets === 'object' && state.targets ? state.targets : {},
      otj: state && typeof state.otj === 'object' && state.otj ? state.otj : {}
    };
  };

  const saveEmployerState = (state) => {
    try { localStorage.setItem(EMPLOYER_STATE_KEY, JSON.stringify(state)); } catch (error) {}
  };

  const readConfidence = () => {
    const value = safeJsonParse(localStorage.getItem(EPA_CONFIDENCE_KEY) || '{}', {});
    return value && typeof value === 'object' ? value : {};
  };

  const saveConfidence = (value) => {
    try { localStorage.setItem(EPA_CONFIDENCE_KEY, JSON.stringify(value)); } catch (error) {}
  };

  const readEpaPractice = () => {
    const value = safeJsonParse(localStorage.getItem(EPA_PRACTICE_KEY) || '{}', {});
    return value && typeof value === 'object' ? value : {};
  };

  const saveEpaPractice = (value) => {
    try { localStorage.setItem(EPA_PRACTICE_KEY, JSON.stringify(value)); } catch (error) {}
  };

  function injectFeatureStyles() {
    if (document.getElementById('eviaApprovedFeatureStyles')) return;
    const style = document.createElement('style');
    style.id = 'eviaApprovedFeatureStyles';
    style.textContent = `
      .employer-evidence-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #e9871b;
        box-shadow: 0 0 0 2px rgba(233,135,27,.12);
        flex: 0 0 auto;
        display: inline-block;
      }
      .pill .employer-evidence-dot { margin-left: 9px; margin-right: 2px; }
      .criterion-tile { position: relative; }
      .criterion-tile > .employer-evidence-dot {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 6px;
        height: 6px;
        margin: 0;
      }
      .epa-readiness-card .epa-readiness-score {
        font-size: 26px;
        font-weight: 700;
        color: rgba(45,45,45,.86);
      }
      .epa-readiness-components {
        display: grid;
        grid-template-columns: repeat(3,minmax(0,1fr));
        gap: 7px;
        margin-top: 10px;
      }
      .epa-readiness-component {
        min-width: 0;
        border: 1px solid rgba(245,196,0,.18);
        border-radius: 14px;
        background: rgba(250,249,242,.72);
        padding: 9px 7px;
        text-align: center;
      }
      .epa-readiness-component strong {
        display: block;
        font-size: 14px;
        color: rgba(45,45,45,.78);
      }
      .epa-readiness-component span {
        display: block;
        margin-top: 3px;
        font-size: 9px;
        line-height: 1.2;
        color: rgba(45,45,45,.48);
      }
      .tinos-qr-wrap {
        width: min(78vw, 320px);
        min-height: min(78vw, 320px);
        margin: 0 auto;
        display: grid;
        place-items: center;
        background: #fff;
        border-radius: 18px;
        padding: 12px;
      }
      .tinos-qr-wrap canvas,
      .tinos-qr-wrap img,
      .tinos-qr-wrap svg { max-width: 100%; height: auto; }
      .tinos-qr-controls {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 8px;
        align-items: center;
        margin-top: 10px;
      }
      .tinos-qr-controls button {
        min-height: 40px;
        border: 1.5px solid rgba(245,196,0,.34);
        border-radius: 999px;
        background: rgba(250,249,242,.98);
        color: rgba(45,45,45,.68);
        padding: 7px 10px;
        font-size: 12px;
      }
      .tinos-qr-count { text-align: center; font-size: 11px; color: rgba(45,45,45,.52); }
      .employer-confirmed-summary {
        margin-top: 8px;
        font-size: 11px;
        color: rgba(45,45,45,.54);
      }
    `;
    document.head.appendChild(style);
  }

  function nodeTargetIds(node, out = []) {
    if (!node || typeof node !== 'object') return out;
    for (const key of ['ksbTargets', 'acTargets']) {
      if (Array.isArray(node[key])) {
        node[key].forEach((id) => {
          const clean = String(id || '').trim();
          if (clean && !out.includes(clean)) out.push(clean);
        });
      }
    }
    if (Array.isArray(node.children)) node.children.forEach((child) => nodeTargetIds(child, out));
    return out;
  }

  function confirmedTargetSet() {
    return new Set(Object.keys(readEmployerState().targets || {}));
  }

  function decorateEmployerMarkers() {
    const confirmed = confirmedTargetSet();

    document.querySelectorAll('.criterion-tile[data-course-target]').forEach((tile) => {
      const id = String(tile.dataset.courseTarget || '').trim();
      const shouldShow = confirmed.has(id);
      let dot = tile.querySelector(':scope > .employer-evidence-dot');
      if (shouldShow && !dot) {
        dot = document.createElement('span');
        dot.className = 'employer-evidence-dot';
        dot.setAttribute('aria-label', 'Employer evidence received');
        dot.title = 'Employer evidence received';
        tile.appendChild(dot);
      } else if (!shouldShow && dot) {
        dot.remove();
      }
    });

    if (typeof currentItems !== 'undefined' && typeof pillStack !== 'undefined') {
      pillStack.querySelectorAll('.pill').forEach((pill) => {
        const index = Number(pill.dataset.index);
        const node = currentItems[index];
        const shouldShow = nodeTargetIds(node, []).some((id) => confirmed.has(id));
        let dot = pill.querySelector(':scope > .employer-evidence-dot');
        if (shouldShow && !dot) {
          dot = document.createElement('span');
          dot.className = 'employer-evidence-dot';
          dot.setAttribute('aria-label', 'Employer evidence received in this area');
          dot.title = 'Employer evidence received';
          const progress = pill.querySelector('.pill-progress-mark');
          if (progress) pill.insertBefore(dot, progress);
          else pill.appendChild(dot);
        } else if (!shouldShow && dot) {
          dot.remove();
        }
      });
    }
  }

  function epaConfidenceValue(label) {
    const values = {
      'not-confident': 20,
      'a-little': 45,
      'fairly-confident': 75,
      'very-confident': 100,
      confident: 100,
      'getting-there': 65,
      'need-help': 30
    };
    return values[label] ?? null;
  }

  function confidenceTaskKey(task) {
    if (task && typeof task === 'object') {
      if (Array.isArray(task.path) && task.path.length) return task.path.map((part) => String(part || '').trim()).join(' › ');
      return String(task.label || '').trim();
    }
    return String(task || '').trim();
  }

  function storeAreaConfidence(task, answer) {
    const key = confidenceTaskKey(task);
    const value = epaConfidenceValue(answer);
    if (!key || value === null) return;
    const state = readConfidence();
    state[key] = { value, answer, updatedAt: new Date().toISOString() };
    saveConfidence(state);
  }

  function currentConfidenceSummary() {
    const state = readConfidence();
    const validTasks = new Set();
    try {
      courseLeaves().forEach((leaf) => {
        const key = confidenceTaskKey({ path: leaf?.path, label: leaf?.node?.label });
        if (key) validTasks.add(key);
      });
    } catch (error) {}
    const values = Object.entries(state)
      .filter(([task, item]) => validTasks.has(task) && Number.isFinite(Number(item?.value)))
      .map(([, item]) => Number(item.value));
    if (!values.length) return { percent: null, recorded: 0, total: validTasks.size };
    return {
      percent: values.reduce((sum, value) => sum + value, 0) / values.length,
      recorded: values.length,
      total: validTasks.size
    };
  }

  function currentCourseCoverage() {
    try {
      const progress = completedCourseProgress();
      return Number.isFinite(Number(progress?.percent)) ? Number(progress.percent) : null;
    } catch (error) {
      return null;
    }
  }

  function currentPracticePercent() {
    const practice = readEpaPractice();
    return Number.isFinite(Number(practice.percent)) ? Number(practice.percent) : null;
  }

  function readinessModel() {
    const coverage = currentCourseCoverage();
    const confidence = currentConfidenceSummary();
    const practice = currentPracticePercent();
    const components = [coverage, confidence.percent, practice].filter((value) => Number.isFinite(Number(value)));
    return {
      percent: components.length ? components.reduce((sum, value) => sum + Number(value), 0) / components.length : null,
      coverage,
      confidence: confidence.percent,
      confidenceRecorded: confidence.recorded,
      confidenceTotal: confidence.total,
      practice
    };
  }

  const fmtPercent = (value) => Number.isFinite(Number(value)) ? `${Math.round(Number(value))}%` : '--';

  function readinessCardMarkup() {
    const model = readinessModel();
    if (model.percent === null) return '';
    return `
      <div class="detail-card epa-readiness-card" id="epaReadinessCard">
        <strong>EPA readiness</strong>
        <div class="epa-readiness-score">${fmtPercent(model.percent)}</div>
        <div class="epa-readiness-components">
          <div class="epa-readiness-component"><strong>${fmtPercent(model.coverage)}</strong><span>course coverage</span></div>
          <div class="epa-readiness-component"><strong>${fmtPercent(model.confidence)}</strong><span>confidence${model.confidenceTotal ? ` · ${model.confidenceRecorded}/${model.confidenceTotal} tasks` : ''}</span></div>
          <div class="epa-readiness-component"><strong>${fmtPercent(model.practice)}</strong><span>EPA practice</span></div>
        </div>
        <p class="detail-muted">This is a readiness indicator, not official gateway approval.</p>
      </div>`;
  }

  function appendReadinessToCourse() {
    try {
      const meta = inferredCourseMeta();
      if (meta?.courseType !== 'ksb') return;
      const markup = readinessCardMarkup();
      if (!markup || document.getElementById('epaReadinessCard')) return;
      archDetailContent.insertAdjacentHTML('beforeend', markup);
    } catch (error) {}
  }

  function storeCompletedEpaPractice(score, total) {
    if (!Number.isFinite(Number(score)) || !Number.isFinite(Number(total)) || Number(total) <= 0) return;
    const state = {
      score: Number(score),
      total: Number(total),
      percent: (Number(score) / Number(total)) * 100,
      completedAt: new Date().toISOString()
    };
    saveEpaPractice(state);
  }

  function employerConfirmedLearningHours() {
    return learningEntries.reduce((sum, entry) => {
      if (!entry?.employerConfirmedAt) return sum;
      const hours = Number(entry.hours);
      return sum + (Number.isFinite(hours) && hours > 0 ? hours : 0);
    }, 0);
  }

  function appendEmployerLearningSummary() {
    const confirmed = employerConfirmedLearningHours();
    if (!confirmed || document.getElementById('employerConfirmedLearningSummary')) return;
    const learner = learnerLearningHours();
    archDetailContent.insertAdjacentHTML(
      'beforeend',
      `<div class="detail-card" id="employerConfirmedLearningSummary"><strong>${confirmed.toFixed(1)}h employer confirmed</strong><p>${confirmed.toFixed(1)} of ${learner.toFixed(1)} learner-added hours have been confirmed through Tinos.</p></div>`
    );
  }

  function compactLearningEntries() {
    return learningEntries.map((entry) => ({
      id: String(entry.id || ''),
      date: String(entry.learningDate || entry.createdAt || ''),
      hours: Number(entry.hours || 0),
      activity: String(entry.activityType || entry.evidenceLabel || ''),
      learning: String(entry.text || ''),
      confirmed: Boolean(entry.employerConfirmedAt)
    }));
  }

  function employerSharePayload() {
    const attendance = loadAttendanceData();
    const required = totalLearningRequirement();
    return {
      type: 'evia-tinos-otj-review',
      version: 1,
      createdAt: new Date().toISOString(),
      course: {
        title: String(activeCourseTitle || ''),
        qualificationId: String(inferredCourseMeta()?.qualificationId || ''),
        requiredHours: Number.isFinite(Number(required)) ? Number(required) : null
      },
      totals: {
        learnerHours: learnerLearningHours(),
        collegeHours: Number(attendance.collegeLearningHours || 0),
        totalHours: learnerLearningHours() + Number(attendance.collegeLearningHours || 0)
      },
      entries: compactLearningEntries()
    };
  }

  function bytesToBase64Url(bytes) {
    let binary = '';
    const slice = 0x8000;
    for (let i = 0; i < bytes.length; i += slice) {
      binary += String.fromCharCode(...bytes.subarray(i, i + slice));
    }
    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
  }

  function makeQrChunks(payload) {
    const json = JSON.stringify(payload);
    const encoded = bytesToBase64Url(new TextEncoder().encode(json));
    const shareId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    const dataSize = 1700;
    const total = Math.max(1, Math.ceil(encoded.length / dataSize));
    const chunks = [];
    for (let part = 0; part < total; part += 1) {
      chunks.push(JSON.stringify({
        type: 'evia-tinos-otj-chunk',
        version: 1,
        shareId,
        part: part + 1,
        total,
        data: encoded.slice(part * dataSize, (part + 1) * dataSize)
      }));
    }
    return chunks;
  }

  async function ensureQrCodeLibrary() {
    if (typeof QRCode === 'function') return true;
    try {
      let response = null;
      if ('caches' in window) {
        const cache = await caches.open(QR_CACHE);
        response = await cache.match(QR_LIBRARY_URL);
        if (!response) {
          const fetched = await fetch(QR_LIBRARY_URL, { mode: 'cors', cache: 'no-store' });
          if (fetched.ok) {
            await cache.put(QR_LIBRARY_URL, fetched.clone());
            response = fetched;
          }
        }
      } else {
        response = await fetch(QR_LIBRARY_URL, { mode: 'cors', cache: 'force-cache' });
      }
      if (!response || !response.ok) return false;
      const source = await response.text();
      (0, eval)(source);
      return typeof QRCode === 'function';
    } catch (error) {
      return false;
    }
  }

  async function renderEmployerShareQr() {
    naxosMenu.classList.remove('open');
    naxosArch.setAttribute('aria-expanded', 'false');
    openArchShell('Share with employer');
    archDetailStack = [];

    const payload = employerSharePayload();
    const chunks = makeQrChunks(payload);
    let index = 0;

    archDetailContent.innerHTML = `
      <div class="detail-card">
        <strong>OTJ for employer confirmation</strong>
        <p>${payload.entries.length} learner-added OTJ entr${payload.entries.length === 1 ? 'y' : 'ies'} · ${payload.totals.learnerHours.toFixed(1)}h learner-added · ${payload.totals.collegeHours.toFixed(1)}h college.</p>
        <p class="detail-muted">The QR contains course and OTJ information only. It does not include the learner's name, phone number or other profile details.</p>
      </div>
      <div class="detail-card">
        <div class="tinos-qr-wrap" id="tinosEmployerQr"></div>
        <div class="tinos-qr-controls">
          <button type="button" id="tinosQrPrev">Previous</button>
          <div class="tinos-qr-count" id="tinosQrCount"></div>
          <button type="button" id="tinosQrNext">Next</button>
        </div>
        <p class="detail-muted" id="tinosQrStatus">Preparing QR…</p>
      </div>`;

    const qrWrap = document.getElementById('tinosEmployerQr');
    const status = document.getElementById('tinosQrStatus');
    const count = document.getElementById('tinosQrCount');
    const prev = document.getElementById('tinosQrPrev');
    const next = document.getElementById('tinosQrNext');

    const ready = await ensureQrCodeLibrary();
    if (!ready) {
      status.textContent = 'QR generation is unavailable on this device right now.';
      count.textContent = '';
      prev.disabled = true;
      next.disabled = true;
      return;
    }

    const draw = () => {
      qrWrap.innerHTML = '';
      new QRCode(qrWrap, {
        text: chunks[index],
        width: 292,
        height: 292,
        correctLevel: QRCode.CorrectLevel.L
      });
      count.textContent = chunks.length === 1 ? '1 QR' : `${index + 1} of ${chunks.length}`;
      prev.disabled = index <= 0;
      next.disabled = index >= chunks.length - 1;
      status.textContent = chunks.length === 1
        ? 'Tinos scans this QR to review the learner-added OTJ.'
        : 'Scan each QR in order. Tinos combines them into one OTJ review.';
    };
    prev.addEventListener('click', () => { if (index > 0) { index -= 1; draw(); } });
    next.addEventListener('click', () => { if (index < chunks.length - 1) { index += 1; draw(); } });
    draw();
  }

  function applyTinosReturn(payload) {
    if (!payload || payload.type !== 'evia-tinos-return') return false;
    const state = readEmployerState();
    const at = String(payload.confirmedAt || new Date().toISOString());

    const targetItems = Array.isArray(payload.targetConfirmations) ? payload.targetConfirmations : [];
    targetItems.forEach((item) => {
      const id = typeof item === 'string' ? item : String(item?.id || '');
      if (!id) return;
      state.targets[id] = {
        confirmedAt: String(item?.confirmedAt || at),
        source: String(item?.source || 'Tinos')
      };
    });

    const otjIds = Array.isArray(payload.otjConfirmations) ? payload.otjConfirmations.map(String) : [];
    const otjSet = new Set(otjIds);
    learningEntries.forEach((entry) => {
      if (!otjSet.has(String(entry.id || ''))) return;
      entry.employerConfirmedAt = at;
      entry.employerConfirmationSource = 'Tinos';
      state.otj[String(entry.id)] = { confirmedAt: at, source: 'Tinos' };
    });

    saveEmployerState(state);
    if (otjSet.size) saveLearningEntries();
    decorateEmployerMarkers();
    updateArchBars().catch(() => {});
    return true;
  }

  function tryHandleTinosQr(rawValue) {
    if (typeof rawValue !== 'string' || !rawValue.trim().startsWith('{')) return false;
    const payload = safeJsonParse(rawValue, null);
    if (!payload || payload.type !== 'evia-tinos-return') return false;
    if (!applyTinosReturn(payload)) return false;
    scannerStatus.textContent = 'Tinos confirmations received.';
    closeScanner(false);
    return true;
  }

  injectFeatureStyles();

  if (typeof renderCoursePage === 'function') {
    const originalRenderCoursePage = renderCoursePage;
    renderCoursePage = function () {
      originalRenderCoursePage();
      appendReadinessToCourse();
      decorateEmployerMarkers();
    };
  }

  if (typeof renderLearnPage === 'function') {
    const originalRenderLearnPage = renderLearnPage;
    renderLearnPage = function () {
      originalRenderLearnPage();
      appendEmployerLearningSummary();
    };
  }

  if (typeof renderPills === 'function') {
    const originalRenderPills = renderPills;
    renderPills = function (...args) {
      const result = originalRenderPills.apply(this, args);
      decorateEmployerMarkers();
      return result;
    };
  }

  if (typeof runQuickReview === 'function') {
    const originalRunQuickReview = runQuickReview;
    runQuickReview = async function (...args) {
      const model = readinessModel();
      if (model.percent !== null) {
        const parts = [
          `course ${fmtPercent(model.coverage)}`,
          `confidence ${fmtPercent(model.confidence)}`,
          `EPA practice ${fmtPercent(model.practice)}`
        ];
        await chatSay(`Your EPA readiness indicator is ${fmtPercent(model.percent)} right now — ${parts.join(', ')}. It is a progress guide, not gateway approval.`);
      }
      return originalRunQuickReview.apply(this, args);
    };
  }

  if (typeof askTestQuestion === 'function') {
    const originalAskTestQuestion = askTestQuestion;
    askTestQuestion = async function (...args) {
      const bank = typeof testBankForCategory === 'function' ? testBankForCategory(testState?.category) : (quickTestBanks[testState?.category] || []);
      if (testState?.category === 'epa' && testState.index >= bank.length && bank.length) {
        storeCompletedEpaPractice(testState.score, bank.length);
        const model = readinessModel();
        await chatSay(`${testState.score}/${bank.length}. Your EPA readiness indicator is now ${fmtPercent(model.percent)}. Want another go?`, [
          { label: 'Test Me again', action: 'test-me' },
          { label: 'Quick Review', action: 'quick-review' },
          { label: 'Teach Me', action: 'teach-me' },
          { label: 'Main menu', action: 'chat-home' }
        ]);
        return;
      }
      return originalAskTestQuestion.apply(this, args);
    };
  }

  if (typeof handleChatAction === 'function') {
    const originalHandleChatAction = handleChatAction;
    handleChatAction = async function (action, value, label) {
      if (action === 'check-confidence' && checkInState) {
        const task = checkInState.tasks?.[checkInState.taskIndex] || checkInState.areas?.[checkInState.areaIndex];
        storeAreaConfidence(task, value);
      }
      return originalHandleChatAction.call(this, action, value, label);
    };
  }

  if (typeof handleQrRawValue === 'function') {
    const originalHandleQrRawValue = handleQrRawValue;
    handleQrRawValue = function (rawValue) {
      if (tryHandleTinosQr(rawValue)) return true;
      return originalHandleQrRawValue.call(this, rawValue);
    };
  }

  if (typeof naxosMenu !== 'undefined') {
    naxosMenu.addEventListener('click', (event) => {
      const button = event.target.closest('[data-naxos-action="send"]');
      if (!button) return;
      event.preventDefault();
      renderEmployerShareQr().catch(() => {
        if (typeof archDetailContent !== 'undefined') {
          archDetailContent.innerHTML = '<div class="detail-card"><strong>Could not prepare employer share</strong><p>Please try again.</p></div>';
        }
      });
    }, true);
  }

  const observer = new MutationObserver(() => decorateEmployerMarkers());
  observer.observe(document.body, { childList: true, subtree: true });
  decorateEmployerMarkers();
})();