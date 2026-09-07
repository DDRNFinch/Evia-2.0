(() => {
  'use strict';

  const ROOT_ID = 'archDetailContent';
  const TITLE_ID = 'archDetailTitle';
  const PANEL_ID = 'archDetailPanel';
  const STYLE_ID = 'eviaAttendLearnStyles';
  let applying = false;
  let queued = false;

  const text = (node) => String(node?.textContent || '').replace(/\s+/g, ' ').trim();

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID}.evia-attend-current .evia-attend-actions,
      #${ROOT_ID}.evia-learn-current #eviaLearnActionsV4{
        width:100%!important;
        display:flex!important;
        flex-direction:column!important;
        gap:10px!important;
        grid-template-columns:none!important;
        margin:10px 0 0!important;
        padding:0!important;
      }
      #${ROOT_ID}.evia-attend-current .evia-attend-actions>button,
      #${ROOT_ID}.evia-learn-current #eviaLearnActionsV4>button{
        width:100%!important;
        max-width:none!important;
        min-width:0!important;
        min-height:54px!important;
        height:auto!important;
        margin:0!important;
        border-radius:999px!important;
        border:1.5px solid rgba(245,196,0,.36)!important;
        background:rgba(250,249,242,.96)!important;
        box-shadow:0 6px 16px rgba(35,35,35,.035)!important;
        position:relative!important;
        text-align:left!important;
      }
      #${ROOT_ID}.evia-attend-current .evia-attend-actions>button{
        padding:9px 18px!important;
        display:flex!important;
        flex-direction:row!important;
        align-items:center!important;
        justify-content:space-between!important;
        gap:14px!important;
      }
      #${ROOT_ID}.evia-attend-current .evia-attend-actions>button:first-child,
      #${ROOT_ID}.evia-learn-current #openManualLearning{
        background:rgba(245,196,0,.09)!important;
        border-color:rgba(245,196,0,.50)!important;
      }
      #${ROOT_ID}.evia-attend-current .evia-attend-actions>button strong,
      #${ROOT_ID}.evia-attend-current .evia-attend-actions>button>span:first-child,
      #${ROOT_ID}.evia-learn-current #eviaLearnActionsV4>button strong{
        font-size:13.5px!important;
        line-height:1.2!important;
        font-weight:800!important;
        color:rgba(45,45,45,.82)!important;
        margin:0!important;
      }
      #${ROOT_ID}.evia-attend-current .evia-attend-actions>button small,
      #${ROOT_ID}.evia-attend-current .evia-attend-actions>button>span:not(:first-child),
      #${ROOT_ID}.evia-learn-current #eviaLearnActionsV4>button span,
      #${ROOT_ID}.evia-learn-current #eviaLearnActionsV4>button small{
        font-size:9.8px!important;
        line-height:1.25!important;
        font-weight:500!important;
        color:rgba(45,45,45,.50)!important;
        margin:0!important;
      }
      #${ROOT_ID}.evia-learn-current #eviaLearnActionsV4>button{
        padding:9px 44px 9px 18px!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:flex-start!important;
        justify-content:center!important;
        gap:2px!important;
      }
      #${ROOT_ID}.evia-learn-current #eviaLearnActionsV4>button::after{
        content:'›'!important;
        position:absolute!important;
        right:18px!important;
        top:50%!important;
        transform:translateY(-50%)!important;
        font-size:24px!important;
        font-weight:400!important;
        color:rgba(45,45,45,.32)!important;
      }
      #${ROOT_ID}.evia-learn-current .learn-action-count{display:none!important}
      #${PANEL_ID}.evia-attend-current #uploadPortfolio,
      #${PANEL_ID}.evia-attend-current [id*="nisia" i],
      #${PANEL_ID}.evia-attend-current [class*="nisia" i],
      #${PANEL_ID}.evia-attend-current [data-action*="nisia" i],
      #${PANEL_ID}.evia-attend-current [data-evia-action*="nisia" i],
      #${PANEL_ID}.evia-attend-current [data-nisia]{display:none!important}
      @media(max-width:390px){
        #${ROOT_ID}.evia-attend-current .evia-attend-actions>button{
          min-height:52px!important;
          padding-top:8px!important;
          padding-bottom:8px!important;
        }
        #${ROOT_ID}.evia-learn-current #eviaLearnActionsV4>button{
          min-height:52px!important;
          padding:8px 42px 8px 15px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function findControl(root, id, pattern, excluded = new Set()) {
    const byId = id ? root.querySelector(`#${id}`) : null;
    if (byId && !excluded.has(byId)) return byId;
    return [...root.querySelectorAll('button,[role="button"],a,[tabindex],.learn-action-card')]
      .find((node) => !excluded.has(node) && pattern.test(text(node))) || null;
  }

  function cleanEmptyAncestors(node, boundary) {
    let current = node;
    for (let depth = 0; depth < 4 && current && current !== boundary; depth += 1) {
      const parent = current.parentElement;
      if (!current.querySelector('button,[role="button"],input,textarea,select,a[href]') && !text(current)) current.remove();
      current = parent;
    }
  }

  function isNisiaControl(node) {
    const value = text(node);
    const attrs = [node.id, ...node.classList, node.getAttribute('data-action'), node.getAttribute('data-evia-action')]
      .filter(Boolean).join(' ').toLowerCase();
    return /\bnisia\b/i.test(value)
      || attrs.includes('nisia')
      || /^connect\s+or\s+sync$/i.test(value)
      || /^connect\s+nisia$/i.test(value)
      || /^sync\s+with\s+nisia$/i.test(value);
  }

  function removeNisiaFromAttend(panel, root) {
    const parents = [];
    [...panel.querySelectorAll('button,[role="button"],a[href],[tabindex],#uploadPortfolio,[id*="nisia" i],[class*="nisia" i],[data-nisia]')]
      .forEach((node) => {
        if (!isNisiaControl(node)) return;
        parents.push(node.parentElement);
        node.remove();
      });

    [...panel.querySelectorAll('div,section,span,p')].forEach((node) => {
      if (!node.isConnected || node === root || node === panel) return;
      if (!isNisiaControl(node)) return;
      if (node.querySelector('#eviaAttendanceManual,#eviaAttendanceQr')) return;
      if (node.children.length > 4) return;
      parents.push(node.parentElement);
      node.remove();
    });

    parents.forEach((parent) => cleanEmptyAncestors(parent, panel));
    root.querySelectorAll('[data-evia-v4-hidden]').forEach((node) => node.removeAttribute('data-evia-v4-hidden'));
  }

  function ensureStack(root, id, className) {
    let stack = root.querySelector(`#${id}`);
    if (!stack) {
      stack = document.createElement('div');
      stack.id = id;
      stack.className = className;
      root.appendChild(stack);
    } else if (className) {
      stack.classList.add(className);
    }
    return stack;
  }

  function applyAttend(root, panel) {
    root.classList.add('evia-attend-current');
    root.classList.remove('evia-learn-current');
    panel.classList.add('evia-attend-current');
    root.dataset.eviaAttendLearnLayout = 'attend-current';
    removeNisiaFromAttend(panel, root);

    const used = new Set();
    const manual = findControl(root, '', /manual\s*update/i, used);
    if (manual) used.add(manual);
    const qr = findControl(root, '', /(qr\s*code|scan\s*(an\s*)?attendance|receive\s+an\s+update)/i, used);
    if (qr) used.add(qr);
    if (!manual && !qr) return;

    const stack = ensureStack(root, 'eviaAttendActionsV4', 'evia-attend-actions');
    const oldParents = [];
    [manual, qr].filter(Boolean).forEach((button) => {
      if (button.parentElement !== stack) oldParents.push(button.parentElement);
      button.removeAttribute('style');
      stack.appendChild(button);
    });

    const oldHeading = [...root.querySelectorAll('strong,h2,h3,h4,p,div,span')]
      .find((node) => node !== stack && node.children.length === 0 && /^update attendance$/i.test(text(node)));
    if (oldHeading) {
      oldHeading.style.display = 'none';
      if (!stack.previousElementSibling?.classList?.contains('evia-current-section-label')) {
        const heading = document.createElement('div');
        heading.className = 'evia-current-section-label';
        heading.textContent = 'Update attendance';
        heading.style.cssText = 'font-size:12px;font-weight:800;color:rgba(45,45,45,.74);margin:4px 4px 0;';
        root.insertBefore(heading, stack);
      }
    }
    oldParents.forEach((parent) => cleanEmptyAncestors(parent, root));
  }

  function applyLearn(root, panel) {
    root.classList.add('evia-learn-current');
    root.classList.remove('evia-attend-current');
    panel.classList.remove('evia-attend-current');
    root.dataset.eviaAttendLearnLayout = 'learn-current';

    const used = new Set();
    const add = findControl(root, 'openManualLearning', /^add\s+learning\b/i, used);
    if (add) used.add(add);
    const catchup = findControl(root, 'openLearnCatchup', /^catch\s*up\b/i, used);
    if (catchup) used.add(catchup);
    const ideas = findControl(root, 'openOtjIdeas', /(learning\s+ideas|explore\s+(?:otj|learning)\s+ideas)/i, used);
    if (ideas) used.add(ideas);
    if (!add && !catchup && !ideas) return;

    const stack = ensureStack(root, 'eviaLearnActionsV4', 'evia-learn-actions');
    const oldParents = [];
    [add, catchup, ideas].filter(Boolean).forEach((button) => {
      if (button.parentElement !== stack) oldParents.push(button.parentElement);
      button.removeAttribute('style');
      stack.appendChild(button);
    });
    oldParents.forEach((parent) => cleanEmptyAncestors(parent, root));
  }

  function clear(root, panel) {
    root.classList.remove('evia-attend-current', 'evia-learn-current');
    panel.classList.remove('evia-attend-current');
    delete root.dataset.eviaAttendLearnLayout;
  }

  function apply() {
    queued = false;
    if (applying) return;
    const root = document.getElementById(ROOT_ID);
    const panel = document.getElementById(PANEL_ID);
    if (!root || !panel) return;
    const title = text(document.getElementById(TITLE_ID));

    applying = true;
    try {
      if (title === 'Attend') applyAttend(root, panel);
      else if (title === 'Learn') applyLearn(root, panel);
      else clear(root, panel);
    } finally {
      applying = false;
    }
  }

  function queueApply() {
    if (queued || applying) return;
    queued = true;
    requestAnimationFrame(apply);
  }

  function boot() {
    injectStyles();
    const panel = document.getElementById(PANEL_ID) || document.body;
    const observer = new MutationObserver(queueApply);
    observer.observe(panel, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'id'] });
    document.addEventListener('click', (event) => {
      if (event.target.closest('#attendanceArch,#learnArch,.arch-detail-back,.back-button')) setTimeout(queueApply, 0);
    }, true);
    queueApply();
    window.__eviaAttendLearnCurrent = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
