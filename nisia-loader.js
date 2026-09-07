(() => {
  'use strict';

  const AUTH_STORAGE_KEY = 'nisia-evia-auth-v1';
  const ASSIGNMENT_KEY = 'eviaNisiaAssignmentV1';
  const CONNECTED_AT_KEY = 'eviaNisiaConnectedAtV1';
  const SUPABASE_URL = 'https://ffgfigkeeeauzkifopei.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_w_R4Kqq3UqNKQuv6erQzAQ_bXBkw8Bc';
  const SUPABASE_SCRIPT = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const NISIA_SYNC_SCRIPT = './nisia-sync.js?v=4';
  const STATUS_STYLE_ID = 'evia-nisia-status-v1';

  let activationPromise = null;
  let boundButton = null;
  let pairingClient = null;
  let pairingInFlight = false;

  function hasNisiaSessionHint() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      return Boolean(raw && raw !== 'null' && raw !== '{}' && raw !== 'undefined');
    } catch {
      return false;
    }
  }

  function readAssignment() {
    try {
      const value = JSON.parse(localStorage.getItem(ASSIGNMENT_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch {
      return {};
    }
  }

  async function ensurePersistentStorage() {
    if (!navigator.storage?.persist) return false;
    try {
      if (navigator.storage.persisted && await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }

  function loadScript(src, id) {
    const existing = document.getElementById(id);
    if (existing) {
      if (existing.dataset.loaded === 'true') return Promise.resolve();
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`Could not load ${id}.`)), { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = false;
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error(`Could not load ${id}.`)), { once: true });
      document.head.appendChild(script);
    });
  }

  async function activateNisia() {
    if (window.__eviaNisiaRuntimeActive) return;
    if (activationPromise) return activationPromise;

    activationPromise = (async () => {
      if (!window.supabase?.createClient) {
        await loadScript(SUPABASE_SCRIPT, 'evia-nisia-supabase-sdk');
      }
      if (!window.supabase?.createClient) throw new Error('Nisia connection library is unavailable.');

      if (!document.querySelector('script[data-evia-nisia-sync="true"]')) {
        const script = document.createElement('script');
        script.src = NISIA_SYNC_SCRIPT;
        script.async = false;
        script.dataset.eviaNisiaSync = 'true';
        await new Promise((resolve, reject) => {
          script.addEventListener('load', resolve, { once: true });
          script.addEventListener('error', () => reject(new Error('Nisia sync could not be loaded.')), { once: true });
          document.head.appendChild(script);
        });
      }

      window.__eviaNisiaRuntimeActive = true;
    })();

    try {
      await activationPromise;
    } catch (error) {
      activationPromise = null;
      throw error;
    }
  }

  function setStandaloneLabel(button) {
    if (!button || window.__eviaNisiaRuntimeActive) return;
    const label = hasNisiaSessionHint() ? 'Sync with Nisia' : 'Connect Nisia';
    if (button.textContent !== label) button.textContent = label;
  }

  function bindConnectionButton() {
    const button = document.getElementById('uploadPortfolio');
    if (!button || boundButton === button) return;
    boundButton = button;
    setStandaloneLabel(button);

    button.addEventListener('click', async (event) => {
      if (window.__eviaNisiaRuntimeActive) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const label = hasNisiaSessionHint() ? 'Sync with Nisia' : 'Connect Nisia';
      button.disabled = true;
      button.textContent = 'Opening…';

      try {
        await activateNisia();
        button.disabled = false;
        button.textContent = label;
        queueMicrotask(() => button.click());
      } catch (error) {
        console.warn('Nisia remains optional and is currently unavailable', error);
        button.disabled = false;
        button.textContent = label;
      }
    }, true);
  }

  function pairingCodeFromQr(rawValue) {
    try {
      const parsed = JSON.parse(String(rawValue || ''));
      if (parsed?.type !== 'nisia-evia-pairing-v1') return '';
      return String(parsed?.pairing_code || '').trim();
    } catch {
      return '';
    }
  }

  function scannerMessage(text) {
    try {
      const status = document.getElementById('scannerStatus');
      if (status && status.textContent !== text) status.textContent = text;
    } catch {}
  }

  async function getPairingClient() {
    if (!window.supabase?.createClient) await loadScript(SUPABASE_SCRIPT, 'evia-nisia-supabase-sdk');
    if (!window.supabase?.createClient) throw new Error('Nisia connection library is unavailable.');
    if (!pairingClient) {
      pairingClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storageKey: AUTH_STORAGE_KEY,
        },
      });
    }
    return pairingClient;
  }

  async function waitForAssignment(timeoutMs = 5000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const assignment = readAssignment();
      if (assignment.learner_id || assignment.enrolment_id || assignment.course_id) return assignment;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return readAssignment();
  }

  async function connectNisiaFromQr(rawValue) {
    const pairingCode = pairingCodeFromQr(rawValue);
    if (!pairingCode || pairingInFlight) return;
    pairingInFlight = true;
    scannerMessage('Connecting to Nisia…');

    try {
      await ensurePersistentStorage();
      const client = await getPairingClient();
      const { data, error } = await client.functions.invoke('evia-redeem-pairing', { body: { pairing_code: pairingCode } });
      if (error || !data?.token_hash) throw new Error(data?.error || 'That Nisia connection QR could not be used.');
      const { error: verifyError } = await client.auth.verifyOtp({ token_hash: data.token_hash, type: 'email' });
      if (verifyError) throw verifyError;
      try { localStorage.setItem(CONNECTED_AT_KEY, new Date().toISOString()); } catch {}

      scannerMessage('Connected. Loading Nisia…');
      await activateNisia();
      const assignment = await waitForAssignment();
      refreshNisiaStatus();
      scannerMessage(assignment.course_title ? `Connected · ${assignment.course_title}` : 'Connected to Nisia.');
      setTimeout(() => {
        try { if (typeof closeScanner === 'function') closeScanner(false); } catch {}
      }, 650);
    } catch (error) {
      console.error('Evia universal QR pairing failed', error);
      scannerMessage(error?.message || 'Nisia could not connect. Try the QR again.');
      try { if (typeof scanFrame === 'function') requestAnimationFrame(scanFrame); } catch {}
    } finally {
      pairingInFlight = false;
      refreshNisiaStatus();
    }
  }

  function installUniversalScanner() {
    try {
      if (typeof handleQrRawValue === 'function' && !handleQrRawValue.__eviaUniversalNisiaScanner) {
        const originalHandleQrRawValue = handleQrRawValue;
        const universalHandler = function(rawValue) {
          if (!pairingCodeFromQr(rawValue)) return originalHandleQrRawValue.apply(this, arguments);
          connectNisiaFromQr(rawValue);
          return true;
        };
        universalHandler.__eviaUniversalNisiaScanner = true;
        handleQrRawValue = universalHandler;
      }
    } catch {}

    try {
      if (typeof startScanner === 'function' && !startScanner.__eviaUniversalNisiaScanner) {
        const originalStartScanner = startScanner;
        const universalStartScanner = function() {
          const result = originalStartScanner.apply(this, arguments);
          scannerMessage('Scan a Naxos course or Nisia connection QR code.');
          return result;
        };
        universalStartScanner.__eviaUniversalNisiaScanner = true;
        startScanner = universalStartScanner;
      }
    } catch {}

    const idleStatus = document.getElementById('scannerStatus');
    const idleText = 'Scan a Naxos course or Nisia connection QR code.';
    if (idleStatus && !document.getElementById('scannerPanel')?.classList.contains('open') && idleStatus.textContent !== idleText) {
      idleStatus.textContent = idleText;
    }
  }

  function injectStatusStyles() {
    if (document.getElementById(STATUS_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STATUS_STYLE_ID;
    style.textContent = `
      .evia-nisia-status-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:46px;border:1.5px solid rgba(245,196,0,.25);border-radius:16px;background:rgba(250,249,242,.96);padding:9px 12px}
      .evia-nisia-status-label{font-size:12px;font-weight:700;color:rgba(45,45,45,.72)}
      .evia-nisia-status-value{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:rgba(45,45,45,.62)}
      .evia-nisia-status-value::before{content:'';width:7px;height:7px;border-radius:50%;background:rgba(45,45,45,.25)}
      .evia-nisia-status-value.connected::before{background:#58a85c}
      .evia-nisia-settings-status .evia-nisia-status-row{margin-top:10px;background:#fff}
    `;
    document.head.appendChild(style);
  }

  function ensureProfileStatus() {
    const form = document.getElementById('learnerProfileForm');
    if (!form || form.querySelector('.evia-nisia-profile-status')) return;
    const row = document.createElement('div');
    row.className = 'evia-nisia-status-row evia-nisia-profile-status';
    row.innerHTML = '<span class="evia-nisia-status-label">Nisia</span><span class="evia-nisia-status-value" data-evia-nisia-status>Not connected</span>';
    const note = form.querySelector('.profile-note');
    if (note) form.insertBefore(row, note); else form.appendChild(row);
  }

  function ensureSettingsStatus() {
    const shell = document.getElementById('eviaStableSettingsShell');
    if (!shell || shell.querySelector('.evia-nisia-settings-status')) return;
    const section = document.createElement('section');
    section.className = 'evia-stable-section evia-nisia-settings-status';
    section.innerHTML = '<strong>Nisia</strong><p class="evia-stable-note">Connection status for this Evia profile.</p><div class="evia-nisia-status-row"><span class="evia-nisia-status-label">Nisia</span><span class="evia-nisia-status-value" data-evia-nisia-status>Not connected</span></div>';
    const version = shell.querySelector('.evia-stable-version');
    if (version) shell.insertBefore(section, version); else shell.appendChild(section);
  }

  function refreshNisiaStatus() {
    injectStatusStyles();
    ensureProfileStatus();
    ensureSettingsStatus();
    const connected = hasNisiaSessionHint();
    const text = connected ? 'Connected' : 'Not connected';
    document.querySelectorAll('[data-evia-nisia-status]').forEach((node) => {
      if (node.textContent !== text) node.textContent = text;
      node.classList.toggle('connected', connected);
    });
  }

  function boot() {
    ensurePersistentStorage().catch(() => {});
    bindConnectionButton();
    installUniversalScanner();
    refreshNisiaStatus();

    const observer = new MutationObserver(() => {
      bindConnectionButton();
      installUniversalScanner();
      refreshNisiaStatus();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    if (hasNisiaSessionHint()) {
      activateNisia().catch((error) => console.warn('Nisia connection will retry when online', error));
    }

    window.addEventListener('online', () => {
      if (hasNisiaSessionHint() && !window.__eviaNisiaRuntimeActive) {
        activateNisia().catch(() => {});
      }
      refreshNisiaStatus();
    });
    window.addEventListener('storage', refreshNisiaStatus);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshNisiaStatus(); });
    document.addEventListener('click', () => setTimeout(refreshNisiaStatus, 0), true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
