(() => {
  'use strict';

  const SUPPORT_KEY = 'eviaLearningSupportV1';
  const TARGETS_KEY = 'eviaMilosTargetsV1';
  const YELLOW = '#f5c400';

  const defaults = {
    textScale: 1,
    dyslexiaFriendly: false,
    tint: 'none',
    lineSpacing: false,
    letterSpacing: false,
    highContrast: false,
    reduceMotion: false,
    simplifiedReading: false,
    readingFocus: false,
    focusY: 50,
    extraThinkingTime: false
  };

  function loadSupport() {
    try {
      const saved = JSON.parse(localStorage.getItem(SUPPORT_KEY) || '{}');
      return { ...defaults, ...(saved && typeof saved === 'object' ? saved : {}) };
    } catch (error) {
      return { ...defaults };
    }
  }

  let support = loadSupport();

  function saveSupport() {
    try { localStorage.setItem(SUPPORT_KEY, JSON.stringify(support)); } catch (error) {}
  }

  function svgIcon(type) {
    const common = `fill="none" stroke="${YELLOW}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
    if (type === 'menu') return `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${common} d="M5 7h14M5 12h14M5 17h14"/></svg>`;
    if (type === 'target') return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle ${common} cx="12" cy="12" r="8"/><circle ${common} cx="12" cy="12" r="4"/><path ${common} d="M14.8 9.2 20 4m0 0h-3m3 0v3"/></svg>`;
    if (type === 'profile') return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle ${common} cx="12" cy="8" r="3.3"/><path ${common} d="M5.5 19c.9-4 3.1-6 6.5-6s5.6 2 6.5 6"/></svg>`;
    if (type === 'settings') return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle ${common} cx="12" cy="12" r="3"/><path ${common} d="M12 3.8v2M12 18.2v2M3.8 12h2M18.2 12h2M6.2 6.2l1.4 1.4m8.8 8.8 1.4 1.4m0-11.6-1.4 1.4m-8.8 8.8-1.4 1.4"/></svg>`;
    if (type === 'back') return `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${common} d="m14.5 6-6 6 6 6"/></svg>`;
    return '';
  }

  function miniEviaIcon() {
    return `<span class="evia-menu-mini" aria-hidden="true"><span class="evia-menu-mini-eye"></span><span class="evia-menu-mini-eye"></span></span>`;
  }

  function injectStyles() {
    if (document.getElementById('eviaMenuSupportStyles')) return;
    const style = document.createElement('style');
    style.id = 'eviaMenuSupportStyles';
    style.textContent = `
      #chatButton{display:none!important}
      #learnerProfileButton{display:none!important}
      .evia-menu-button{position:absolute;right:max(14px,env(safe-area-inset-right));top:calc(max(14px,env(safe-area-inset-top)) + 8px);width:44px;height:44px;border:1.5px solid rgba(245,196,0,.34);border-radius:50%;background:rgba(255,255,255,.97);box-shadow:0 7px 18px rgba(0,0,0,.05);display:grid;place-items:center;z-index:42;cursor:pointer}
      .evia-menu-button svg{width:22px;height:22px}
      .evia-tools-menu{position:absolute;right:max(14px,env(safe-area-inset-right));top:calc(max(14px,env(safe-area-inset-top)) + 60px);width:min(248px,calc(100vw - 28px));padding:10px;border:1.5px solid rgba(245,196,0,.24);border-radius:26px;background:rgba(255,255,255,.97);box-shadow:0 18px 48px rgba(0,0,0,.10);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:none;flex-direction:column;gap:7px;z-index:41}
      .evia-tools-menu.open{display:flex}
      .evia-tool-item{width:100%;min-height:50px;border:0;border-radius:18px;background:rgba(250,249,242,.78);display:flex;align-items:center;gap:12px;padding:8px 12px;color:#505050;font-size:13px;font-weight:600;text-align:left;cursor:pointer}
      .evia-tool-item:active{transform:scale(.99)}
      .evia-tool-icon{width:28px;height:28px;display:grid;place-items:center;flex:0 0 28px}
      .evia-tool-icon svg{width:25px;height:25px}
      .evia-menu-mini{width:27px;height:27px;border:1.8px solid ${YELLOW};border-radius:50%;display:flex;align-items:center;justify-content:center;gap:3px;box-shadow:0 0 10px rgba(245,196,0,.13)}
      .evia-menu-mini-eye{width:6px;height:6px;border:1.3px solid ${YELLOW};border-radius:50%;display:block}
      .evia-support-overlay{position:absolute;inset:0;background:rgba(255,255,255,.97);display:none;z-index:120;overflow:auto;padding:calc(max(16px,env(safe-area-inset-top)) + 8px) 18px calc(max(22px,env(safe-area-inset-bottom)) + 18px)}
      .evia-support-overlay.open{display:block}
      .evia-support-shell{width:min(100%,480px);margin:0 auto}
      .evia-support-header{display:flex;align-items:center;gap:10px;margin-bottom:18px}
      .evia-support-back{width:42px;height:42px;border:1.5px solid rgba(245,196,0,.32);border-radius:50%;background:#fff;display:grid;place-items:center;cursor:pointer}
      .evia-support-back svg{width:22px;height:22px}
      .evia-support-title{font-size:22px;font-weight:700;color:#333}
      .evia-support-subtitle{margin-top:2px;font-size:12px;line-height:1.4;color:#666}
      .evia-target-empty,.evia-target-card,.evia-support-section{border:1.5px solid rgba(245,196,0,.25);border-radius:24px;background:linear-gradient(180deg,#fff,rgba(250,249,242,.94));box-shadow:0 8px 22px rgba(0,0,0,.035);padding:16px;margin-bottom:11px}
      .evia-target-empty{min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px}
      .evia-target-empty svg{width:46px;height:46px}
      .evia-target-empty strong,.evia-target-card strong,.evia-support-section>strong{font-size:15px;color:#333}
      .evia-target-empty p,.evia-target-card p,.evia-support-note{font-size:12px;line-height:1.5;color:#5c5c5c;margin-top:6px}
      .evia-target-card small{display:block;margin-top:8px;color:#777;font-size:10px}
      .support-row{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:50px;border-top:1px solid rgba(45,45,45,.06)}
      .support-row:first-of-type{border-top:0}
      .support-label{display:flex;flex-direction:column;gap:2px;min-width:0}
      .support-label strong{font-size:13px;color:#3d3d3d}
      .support-label span{font-size:10.5px;line-height:1.35;color:#707070}
      .support-toggle{width:46px;height:27px;padding:2px;border:0;border-radius:999px;background:#ddd;flex:0 0 auto;cursor:pointer;transition:background .18s ease}
      .support-toggle::after{content:'';display:block;width:23px;height:23px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.18);transition:transform .18s ease}
      .support-toggle.on{background:${YELLOW}}
      .support-toggle.on::after{transform:translateX(19px)}
      .support-range{width:108px;accent-color:${YELLOW}}
      .tint-options{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
      .tint-choice{width:28px;height:28px;border-radius:50%;border:2px solid rgba(45,45,45,.12);cursor:pointer}
      .tint-choice.selected{outline:2px solid ${YELLOW};outline-offset:2px}
      .read-aloud-button{width:100%;min-height:44px;margin-top:8px;border:1.5px solid rgba(245,196,0,.34);border-radius:999px;background:rgba(250,249,242,.98);color:#555;font-size:12px;font-weight:600;cursor:pointer}
      html.evia-dyslexia body{font-family:Verdana,Tahoma,Arial,sans-serif!important}
      html.evia-line-spacing #screen{line-height:1.65!important}
      html.evia-line-spacing #screen p,html.evia-line-spacing #screen .chat-bubble,html.evia-line-spacing #screen .pill{line-height:1.65!important}
      html.evia-letter-spacing #screen{letter-spacing:.045em!important;word-spacing:.12em!important}
      html.evia-high-contrast #screen{filter:contrast(1.2)}
      html.evia-reduce-motion #screen *,html.evia-reduce-motion #screen *::before,html.evia-reduce-motion #screen *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
      html.evia-simple-reading #screen .evia-float::before{display:none!important}
      html.evia-simple-reading #screen .detail-card p,html.evia-simple-reading #screen .chat-bubble{font-size:1.05em;line-height:1.65;max-width:36em}
      .evia-focus-mask{position:fixed;inset:0;z-index:110;pointer-events:none;display:none}
      .evia-focus-mask.on{display:block}
      .evia-focus-dim{position:absolute;left:0;right:0;background:rgba(35,35,35,.44);pointer-events:none}
      .evia-focus-dim.top{top:0;height:calc(var(--focus-y,50vh) - 42px)}
      .evia-focus-dim.bottom{top:calc(var(--focus-y,50vh) + 42px);bottom:0}
      .evia-focus-strip{position:absolute;left:0;right:0;top:calc(var(--focus-y,50vh) - 42px);height:84px;border-top:1.5px solid rgba(245,196,0,.7);border-bottom:1.5px solid rgba(245,196,0,.7);background:rgba(255,255,255,.035);pointer-events:none}
      .evia-focus-handle{position:absolute;right:8px;top:calc(var(--focus-y,50vh) - 21px);width:38px;height:42px;border:1.5px solid rgba(245,196,0,.75);border-radius:18px;background:rgba(255,255,255,.95);pointer-events:auto;touch-action:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;box-shadow:0 5px 15px rgba(0,0,0,.12)}
      .evia-focus-handle i{display:block;width:15px;height:1.5px;border-radius:2px;background:${YELLOW}}
      body{font-size:calc(16px * var(--evia-text-scale,1))}
    `;
    document.head.appendChild(style);
  }

  function createMenuUi() {
    if (document.getElementById('eviaToolsMenuButton')) return;
    const host = document.getElementById('screen') || document.body;

    const button = document.createElement('button');
    button.id = 'eviaToolsMenuButton';
    button.className = 'evia-menu-button';
    button.type = 'button';
    button.setAttribute('aria-label', 'Open Evia menu');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = svgIcon('menu');

    const menu = document.createElement('div');
    menu.id = 'eviaToolsMenu';
    menu.className = 'evia-tools-menu';
    menu.setAttribute('aria-label', 'Evia menu');
    menu.innerHTML = `
      <button class="evia-tool-item" type="button" data-evia-tool="chat"><span class="evia-tool-icon">${miniEviaIcon()}</span><span>Chat with Evia</span></button>
      <button class="evia-tool-item" type="button" data-evia-tool="targets"><span class="evia-tool-icon">${svgIcon('target')}</span><span>Targets</span></button>
      <button class="evia-tool-item" type="button" data-evia-tool="profile"><span class="evia-tool-icon">${svgIcon('profile')}</span><span>Learner Profile</span></button>
      <button class="evia-tool-item" type="button" data-evia-tool="settings"><span class="evia-tool-icon">${svgIcon('settings')}</span><span>Settings</span></button>`;

    const overlay = document.createElement('section');
    overlay.id = 'eviaSupportOverlay';
    overlay.className = 'evia-support-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `<div class="evia-support-shell"><div class="evia-support-header"><button class="evia-support-back" type="button" aria-label="Back">${svgIcon('back')}</button><div><div class="evia-support-title" id="eviaSupportTitle"></div><div class="evia-support-subtitle" id="eviaSupportSubtitle"></div></div></div><div id="eviaSupportContent"></div></div>`;

    const focus = document.createElement('div');
    focus.id = 'eviaReadingFocus';
    focus.className = 'evia-focus-mask';
    focus.setAttribute('aria-hidden', 'true');
    focus.innerHTML = `<div class="evia-focus-dim top"></div><div class="evia-focus-strip"></div><div class="evia-focus-dim bottom"></div><div class="evia-focus-handle" aria-label="Hold and slide reading focus"><i></i><i></i><i></i></div>`;

    host.appendChild(button);
    host.appendChild(menu);
    host.appendChild(overlay);
    document.body.appendChild(focus);

    button.addEventListener('click', () => {
      const open = !menu.classList.contains('open');
      menu.classList.toggle('open', open);
      button.setAttribute('aria-expanded', String(open));
    });

    menu.addEventListener('click', (event) => {
      const item = event.target.closest('[data-evia-tool]');
      if (!item) return;
      closeMenu();
      const tool = item.dataset.eviaTool;
      if (tool === 'chat') {
        try { if (typeof openChat === 'function') openChat(); else document.getElementById('chatButton')?.click(); } catch (error) {}
      } else if (tool === 'targets') {
        openTargets();
      } else if (tool === 'profile') {
        try {
          if (typeof openPortfolio === 'function') Promise.resolve(openPortfolio()).then(() => { if (typeof openLearnerProfile === 'function') openLearnerProfile(); });
        } catch (error) {}
      } else if (tool === 'settings') {
        openSettings();
      }
    });

    overlay.querySelector('.evia-support-back')?.addEventListener('click', closeOverlay);
    document.addEventListener('pointerdown', (event) => {
      if (!menu.classList.contains('open')) return;
      if (menu.contains(event.target) || button.contains(event.target)) return;
      closeMenu();
    });

    attachReadingFocusDrag(focus);
  }

  function closeMenu() {
    const menu = document.getElementById('eviaToolsMenu');
    const button = document.getElementById('eviaToolsMenuButton');
    menu?.classList.remove('open');
    button?.setAttribute('aria-expanded', 'false');
  }

  function showOverlay(title, subtitle, html) {
    const overlay = document.getElementById('eviaSupportOverlay');
    if (!overlay) return;
    document.getElementById('eviaSupportTitle').textContent = title;
    document.getElementById('eviaSupportSubtitle').textContent = subtitle || '';
    document.getElementById('eviaSupportContent').innerHTML = html;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function closeOverlay() {
    const overlay = document.getElementById('eviaSupportOverlay');
    overlay?.classList.remove('open');
    overlay?.setAttribute('aria-hidden', 'true');
    window.speechSynthesis?.cancel?.();
  }

  function loadTargets() {
    try {
      const data = JSON.parse(localStorage.getItem(TARGETS_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }

  function openTargets() {
    const targets = loadTargets();
    const html = targets.length
      ? targets.map((target) => `<article class="evia-target-card"><strong>${escapeHtml(target.title || target.target || 'Target')}</strong>${target.detail || target.description ? `<p>${escapeHtml(target.detail || target.description)}</p>` : ''}${target.reviewDate || target.dueDate ? `<small>${escapeHtml(target.reviewDate ? `From review: ${target.reviewDate}` : `Due: ${target.dueDate}`)}</small>` : ''}</article>`).join('')
      : `<div class="evia-target-empty">${svgIcon('target')}<strong>No review targets yet</strong><p>Targets set during your Milos reviews will appear here for you to check at any time.</p></div>`;
    showOverlay('Targets', 'Your current review targets', html);
  }

  function toggleRow(key, title, description) {
    return `<div class="support-row"><span class="support-label"><strong>${title}</strong><span>${description}</span></span><button class="support-toggle${support[key] ? ' on' : ''}" type="button" data-support-toggle="${key}" aria-pressed="${support[key] ? 'true' : 'false'}"></button></div>`;
  }

  function openSettings() {
    const tints = [
      ['none','#ffffff','No tint'],
      ['cream','#fff8df','Cream'],
      ['blue','#edf7ff','Pale blue'],
      ['green','#eef9ef','Pale green'],
      ['grey','#f2f2f2','Soft grey']
    ];
    const html = `
      <section class="evia-support-section"><strong>Learning Support</strong><p class="evia-support-note">Choose the adjustments that make Evia easier and more comfortable to use. These settings stay on this device.</p>
        <div class="support-row"><span class="support-label"><strong>Text size</strong><span>Make text smaller or larger.</span></span><input class="support-range" id="eviaTextScale" type="range" min="0.9" max="1.35" step="0.05" value="${Number(support.textScale) || 1}"></div>
        ${toggleRow('dyslexiaFriendly','Dyslexia-friendly text','Uses a clearer system font and keeps wording easy to scan.')}
        <div class="support-row"><span class="support-label"><strong>Screen tint</strong><span>Choose a softer background tint.</span></span><div class="tint-options">${tints.map(([id,colour,label]) => `<button class="tint-choice${support.tint === id ? ' selected' : ''}" type="button" data-tint="${id}" aria-label="${label}" title="${label}" style="background:${colour}"></button>`).join('')}</div></div>
        ${toggleRow('readingFocus','Reading Focus','Hold the handle and slide the focus window up or down anywhere on Evia.')}
        ${toggleRow('lineSpacing','More line spacing','Adds more space between lines of text.')}
        ${toggleRow('letterSpacing','More word and letter spacing','Adds extra spacing to make text easier to separate.')}
        ${toggleRow('highContrast','Higher contrast','Makes text and interface edges stronger.')}
        ${toggleRow('reduceMotion','Reduce movement','Stops non-essential animation and movement.')}
        ${toggleRow('simplifiedReading','Simplified reading','Reduces visual distraction and gives text more breathing room.')}
        ${toggleRow('extraThinkingTime','Extra thinking time','Remembers that you prefer more time for questions and timed activities.')}
        <button class="read-aloud-button" id="eviaReadAloud" type="button">Read this page aloud</button>
      </section>`;
    showOverlay('Settings', 'Learning Support', html);
    bindSettingsControls();
  }

  function bindSettingsControls() {
    document.querySelectorAll('[data-support-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.supportToggle;
        support[key] = !support[key];
        button.classList.toggle('on', support[key]);
        button.setAttribute('aria-pressed', String(support[key]));
        saveSupport();
        applySupport();
      });
    });
    document.getElementById('eviaTextScale')?.addEventListener('input', (event) => {
      support.textScale = Number(event.target.value) || 1;
      saveSupport();
      applySupport();
    });
    document.querySelectorAll('[data-tint]').forEach((button) => {
      button.addEventListener('click', () => {
        support.tint = button.dataset.tint || 'none';
        document.querySelectorAll('[data-tint]').forEach((choice) => choice.classList.toggle('selected', choice === button));
        saveSupport();
        applySupport();
      });
    });
    document.getElementById('eviaReadAloud')?.addEventListener('click', readVisiblePage);
  }

  function readVisiblePage() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const overlay = document.getElementById('eviaSupportOverlay');
    const activePanel = [...document.querySelectorAll('.overlay-panel.open')].find((node) => node.offsetParent !== null);
    const source = overlay?.classList.contains('open') ? overlay : (activePanel || document.getElementById('screen'));
    const text = String(source?.innerText || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 7000));
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  }

  function applySupport() {
    const root = document.documentElement;
    root.style.setProperty('--evia-text-scale', String(Math.max(.9, Math.min(1.35, Number(support.textScale) || 1))));
    root.classList.toggle('evia-dyslexia', Boolean(support.dyslexiaFriendly));
    root.classList.toggle('evia-line-spacing', Boolean(support.lineSpacing));
    root.classList.toggle('evia-letter-spacing', Boolean(support.letterSpacing));
    root.classList.toggle('evia-high-contrast', Boolean(support.highContrast));
    root.classList.toggle('evia-reduce-motion', Boolean(support.reduceMotion));
    root.classList.toggle('evia-simple-reading', Boolean(support.simplifiedReading));

    const tintMap = { none:'#ffffff', cream:'#fff8df', blue:'#edf7ff', green:'#eef9ef', grey:'#f2f2f2' };
    const tint = tintMap[support.tint] || tintMap.none;
    root.style.setProperty('--bg', tint);
    document.body.style.background = tint;

    const focus = document.getElementById('eviaReadingFocus');
    if (focus) {
      focus.classList.toggle('on', Boolean(support.readingFocus));
      focus.setAttribute('aria-hidden', support.readingFocus ? 'false' : 'true');
      const y = Math.max(8, Math.min(92, Number(support.focusY) || 50));
      focus.style.setProperty('--focus-y', `${y}vh`);
    }
  }

  function attachReadingFocusDrag(focus) {
    const handle = focus.querySelector('.evia-focus-handle');
    if (!handle) return;
    let dragging = false;
    const move = (clientY) => {
      const h = Math.max(1, window.innerHeight);
      const percent = Math.max(8, Math.min(92, (clientY / h) * 100));
      support.focusY = Math.round(percent * 10) / 10;
      focus.style.setProperty('--focus-y', `${support.focusY}vh`);
    };
    handle.addEventListener('pointerdown', (event) => {
      dragging = true;
      handle.setPointerCapture?.(event.pointerId);
      move(event.clientY);
      event.preventDefault();
    });
    handle.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      move(event.clientY);
      event.preventDefault();
    });
    const finish = () => {
      if (!dragging) return;
      dragging = false;
      saveSupport();
    };
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  }

  injectStyles();
  createMenuUi();
  applySupport();
})();
