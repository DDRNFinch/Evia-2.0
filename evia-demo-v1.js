(() => {
  'use strict';

  const DEMO_FLAG = 'eviaDemoModeV1';
  const DEMO_VERSION_KEY = 'eviaDemoVersionV1';
  const DEMO_VERSION = '1';
  const COURSE_KEY = 'eviaNaxosCourse';
  const COURSE_TITLE_KEY = 'eviaNaxosCourseTitle';
  const COURSE_META_KEY = 'eviaNaxosCourseMetaV1';
  const COMPLETED_KEY = 'eviaCompletedEvidencePathsV1';
  const DEMO_TITLE = 'The Evia Challenge — Demo';

  const colleaguePrompts = [
    'has worked here the longest',
    'is wearing something blue',
    'travelled furthest today',
    'has the longest job title',
    'has the most unusual hobby',
    'would be your first choice for a quiz team'
  ];
  const soloPrompts = [
    'find something you use every working day',
    'find something smaller than a £1 coin',
    'find something nearby that contains red',
    'find something with more than five buttons',
    'find something that makes a noise',
    'find something people normally overlook'
  ];

  const pick = (items) => items[Math.floor(Math.random() * items.length)] || items[0];
  const colleaguePrompt = pick(colleaguePrompts);
  const soloPrompt = pick(soloPrompts);

  const leaf = (label, recommended, alternative, requirements, ksbTargets) => ({
    label,
    recommended,
    alternative,
    requirements,
    ksbTargets
  });

  const demoCourse = [
    {
      label: 'Knowledge',
      children: [
        leaf(
          'K1 · Stationery Detective',
          {
            label: 'Photo + audio',
            type: 'camera',
            details: [
              { displayType: 'Photo', label: '1 photo', instruction: 'Take a photo of any piece of stationery.' },
              { displayType: 'Audio', label: 'Short audio', instruction: 'Explain what it is and what it is used for.' }
            ]
          },
          {
            label: 'Video',
            type: 'video',
            details: [
              { displayType: 'Video', label: '1 short video', instruction: 'Film the stationery and explain what it is and what it is used for.' }
            ]
          },
          'Pick any piece of stationery. Prove that you can identify it and explain its purpose.',
          ['K1']
        ),
        leaf(
          'K2 · Mystery Object',
          {
            label: 'Photo + written',
            type: 'camera',
            details: [
              { displayType: 'Photo', label: '1 photo', instruction: 'Find the strangest object you can see and take a photo of it.' },
              { displayType: 'Written', label: 'Short written answer', instruction: 'Write one sentence saying why you chose it.' }
            ]
          },
          {
            label: 'Audio',
            type: 'audio',
            details: [
              { displayType: 'Audio', label: 'Short audio', instruction: 'Describe an object without saying its name. If someone is with you, see if they can guess it.' }
            ]
          },
          'Choose something nearby and describe or explain it clearly.',
          ['K2']
        )
      ]
    },
    {
      label: 'Skills',
      children: [
        leaf(
          'S1 · Rock, Paper, Scissors',
          {
            label: 'Video',
            type: 'video',
            details: [
              { displayType: 'Video', label: '1 short video', instruction: 'Record a best-of-three rock, paper, scissors match.' }
            ]
          },
          {
            label: '3 photos + written',
            type: 'camera',
            details: [
              { displayType: 'Photo', label: '3 photos', instruction: 'Take a photo of the winning hand from each of three rounds.' },
              { displayType: 'Written', label: 'Short written answer', instruction: 'Write who won the match.' }
            ]
          },
          'Play three quick rounds and capture enough evidence to show the result.',
          ['S1']
        ),
        leaf(
          'S2 · 30-Second Tower',
          {
            label: 'Video',
            type: 'video',
            details: [
              { displayType: 'Video', label: '1 short video', instruction: 'Using three nearby objects, build the tallest freestanding tower you can. Record the attempt or finished result.' }
            ]
          },
          {
            label: '3 photos + audio',
            type: 'camera',
            details: [
              { displayType: 'Photo', label: '3 photos', instruction: 'Take a before, during and finished photo of your tower.' },
              { displayType: 'Audio', label: 'Short audio', instruction: 'Explain what made the tower stand up — or why it fell down.' }
            ]
          },
          'You have about 30 seconds. Use three things within reach and make them stand as tall as you can.',
          ['S2']
        )
      ]
    },
    {
      label: 'Behaviours',
      children: [
        leaf(
          'B1 · Tongue-Twister Test',
          {
            label: 'Audio',
            type: 'audio',
            details: [
              { displayType: 'Audio', label: '1 audio recording', instruction: 'Say “red lorry, yellow lorry” five times without a mistake.' }
            ]
          },
          {
            label: 'Video',
            type: 'video',
            details: [
              { displayType: 'Video', label: '1 short video', instruction: 'Record someone else trying “red lorry, yellow lorry” five times without a mistake.' }
            ]
          },
          'Five clean repetitions. If it goes wrong, have another go.',
          ['B1']
        ),
        leaf(
          'B2 · Find Someone Who…',
          {
            label: 'Photo + audio or written',
            type: 'camera',
            details: [
              { displayType: 'Photo', label: '1 photo', instruction: `With colleagues, take a photo of a colleague who ${colleaguePrompt}. If you are on your own, ${soloPrompt} and take a photo of it.` },
              { displayType: 'Audio or written', label: 'Audio or written', instruction: 'Explain in one short line or audio clip why your choice fits the challenge.' }
            ]
          },
          {
            label: 'Witness verification',
            type: 'witness',
            details: [
              { displayType: 'Witness testimony', label: 'Witness testimony', instruction: 'Ask someone in the room to verify your answer using witness evidence.' }
            ]
          },
          `With colleagues: find someone who ${colleaguePrompt}. On your own: ${soloPrompt}.`,
          ['B2']
        )
      ]
    }
  ];

  const paths = {
    K1: ['Knowledge', 'K1 · Stationery Detective'],
    K2: ['Knowledge', 'K2 · Mystery Object'],
    S1: ['Skills', 'S1 · Rock, Paper, Scissors'],
    S2: ['Skills', 'S2 · 30-Second Tower'],
    B1: ['Behaviours', 'B1 · Tongue-Twister Test'],
    B2: ['Behaviours', 'B2 · Find Someone Who…']
  };

  const demoMeta = {
    demo: true,
    demoVersion: DEMO_VERSION,
    courseType: 'ksb',
    standardCode: 'EVIA-DEMO',
    standardTitle: 'The Evia Challenge',
    mappings: Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, [path]])),
    ksbOrder: ['K1', 'K2', 'S1', 'S2', 'B1', 'B2'],
    criteria: [
      { id: 'K1', wording: 'Identify and explain a familiar object.' },
      { id: 'K2', wording: 'Describe or explain an object clearly.' },
      { id: 'S1', wording: 'Complete and evidence a quick competitive activity.' },
      { id: 'S2', wording: 'Complete and evidence a short practical challenge.' },
      { id: 'B1', wording: 'Keep going and communicate clearly under pressure.' },
      { id: 'B2', wording: 'Respond to a quick challenge involving people or your surroundings.' }
    ]
  };

  function hasValue(key) {
    try {
      const value = localStorage.getItem(key);
      return value !== null && value !== '' && value !== 'null' && value !== '{}' && value !== '[]';
    } catch { return false; }
  }

  function isFreshEvia() {
    if (hasValue(COURSE_KEY)) return false;
    const blockers = [
      'nisia-evia-auth-v1',
      'eviaNisiaAssignmentV1',
      'eviaLearnerProfile',
      COMPLETED_KEY,
      'eviaLearningEntries',
      'eviaAttendanceDataV1'
    ];
    return !blockers.some(hasValue);
  }

  function seedDemo() {
    try {
      localStorage.setItem(COURSE_KEY, JSON.stringify(demoCourse));
      localStorage.setItem(COURSE_TITLE_KEY, DEMO_TITLE);
      localStorage.setItem(COURSE_META_KEY, JSON.stringify(demoMeta));
      localStorage.setItem(DEMO_FLAG, '1');
      localStorage.setItem(DEMO_VERSION_KEY, DEMO_VERSION);
    } catch {}
  }

  if (isFreshEvia()) seedDemo();

  function isDemoMode() {
    try {
      if (localStorage.getItem(DEMO_FLAG) === '1') return true;
      const meta = JSON.parse(localStorage.getItem(COURSE_META_KEY) || '{}');
      return meta?.demo === true;
    } catch { return false; }
  }

  const learnerKeyPattern = /^evia(?:LearnerProfile|Naxos|CompletedEvidence|LearningEntries|AttendanceData|MilosTargets|EPA|Epa|QuickReview|Review|CheckIn|Wellbeing|Tinos|Employer|Portfolio|Target|Course)/;

  function clearDemoLocalState(storage) {
    try {
      const remove = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key && (key === DEMO_FLAG || key === DEMO_VERSION_KEY || learnerKeyPattern.test(key))) remove.push(key);
      }
      remove.forEach((key) => storage.removeItem(key));
    } catch {}
  }

  function clearPortfolio() {
    return new Promise((resolve) => {
      if (!window.indexedDB?.open) return resolve();
      const request = indexedDB.open('EviaPortfolio', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('evidence')) db.createObjectStore('evidence', { keyPath: 'id' });
      };
      request.onerror = () => resolve();
      request.onsuccess = () => {
        const db = request.result;
        try {
          const tx = db.transaction('evidence', 'readwrite');
          tx.objectStore('evidence').clear();
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); resolve(); };
        } catch { db.close(); resolve(); }
      };
    });
  }

  async function prepareForFullMode() {
    if (!isDemoMode()) return false;
    clearDemoLocalState(localStorage);
    clearDemoLocalState(sessionStorage);
    const completion = document.getElementById('eviaDemoComplete');
    if (completion) completion.remove();
    await clearPortfolio();
    return true;
  }

  function completedCount() {
    try {
      const saved = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]');
      return Array.isArray(saved) ? Math.min(6, saved.length) : 0;
    } catch { return 0; }
  }

  function addDemoStyles() {
    if (document.getElementById('eviaDemoStyles')) return;
    const style = document.createElement('style');
    style.id = 'eviaDemoStyles';
    style.textContent = `
      .evia-demo-complete{position:fixed;inset:0;z-index:10050;background:rgba(255,255,255,.985);display:grid;place-items:center;padding:22px}.evia-demo-complete-card{width:min(100%,430px);border:1.5px solid rgba(242,201,76,.34);border-radius:28px;background:linear-gradient(180deg,#fff,#fffdf7);padding:24px;text-align:center;box-shadow:0 18px 55px rgba(35,35,35,.11)}.evia-demo-complete-mark{width:68px;height:68px;border:3px solid #f2c94c;border-radius:50%;display:grid;place-items:center;margin:0 auto 14px;color:#c59b24;font-size:26px;font-weight:800}.evia-demo-complete h2{margin:0;color:#333;font-size:24px}.evia-demo-complete p{margin:8px 0 0;color:#666;font-size:13px;line-height:1.5}.evia-demo-complete-stats{margin:16px 0 0;display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.evia-demo-complete-stat{border:1px solid rgba(45,45,45,.07);border-radius:15px;background:#fff;padding:10px 6px}.evia-demo-complete-stat strong{display:block;color:#3a3a3a;font-size:18px}.evia-demo-complete-stat span{display:block;margin-top:2px;color:#777;font-size:9px}.evia-demo-complete button{width:100%;min-height:48px;margin-top:17px;border:1.5px solid rgba(242,201,76,.44);border-radius:999px;background:rgba(242,201,76,.13);color:#4e462f;font:inherit;font-size:13px;font-weight:800}`;
    document.head.appendChild(style);
  }

  function showComplete() {
    if (!isDemoMode() || document.getElementById('eviaDemoComplete')) return;
    try {
      if (sessionStorage.getItem('eviaDemoCompleteShownV1') === '1') return;
      sessionStorage.setItem('eviaDemoCompleteShownV1', '1');
    } catch {}
    addDemoStyles();
    const overlay = document.createElement('section');
    overlay.id = 'eviaDemoComplete';
    overlay.className = 'evia-demo-complete';
    overlay.innerHTML = `<div class="evia-demo-complete-card"><div class="evia-demo-complete-mark">✓</div><h2>Evia Challenge complete</h2><p>Six quick challenges. Six evidence areas. One complete mini-course.</p><div class="evia-demo-complete-stats"><div class="evia-demo-complete-stat"><strong>2</strong><span>Knowledge</span></div><div class="evia-demo-complete-stat"><strong>2</strong><span>Skills</span></div><div class="evia-demo-complete-stat"><strong>2</strong><span>Behaviours</span></div></div><p>You have just used the same evidence journey Evia uses on a real apprenticeship — compressed into a few minutes.</p><button type="button" data-demo-close>Keep exploring Evia</button></div>`;
    overlay.querySelector('[data-demo-close]')?.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  }

  function welcome() {
    if (!isDemoMode()) return;
    const count = completedCount();
    try {
      if (typeof setSpeech === 'function') {
        if (!count) setSpeech(["Hi, I'm Evia. I've got six quick challenges for you.", 'Tap me, then open My Course to start.']);
        else if (count < 6) setSpeech([`Your Evia Challenge is ${count} of 6 complete.`, 'Ready for another quick one?']);
      }
    } catch {}
  }

  function bootUi() {
    if (!isDemoMode()) return;
    welcome();
    let last = completedCount();
    const timer = window.setInterval(() => {
      if (!isDemoMode()) { window.clearInterval(timer); return; }
      const count = completedCount();
      if (count !== last) last = count;
      if (count >= 6) {
        const screen = document.getElementById('screen');
        if (!screen || (!screen.classList.contains('evidence-open') && !screen.classList.contains('completion-open'))) showComplete();
      }
    }, 650);
  }

  window.__eviaDemo = {
    isActive: isDemoMode,
    prepareForFullMode,
    title: DEMO_TITLE,
    version: DEMO_VERSION
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootUi, { once: true });
  else bootUi();
})();
