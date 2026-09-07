(() => {
  'use strict';

  const SUPABASE_URL = 'https://ffgfigkeeeauzkifopei.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_w_R4Kqq3UqNKQuv6erQzAQ_bXBkw8Bc';
  const AUTH_STORAGE_KEY = 'nisia-evia-auth-v1';
  const ASSIGNMENT_KEY = 'eviaNisiaAssignmentV1';
  const BASELINE_KEY = 'eviaNisiaEvidenceBaselineV1';
  const SYNC_STATE_KEY = 'eviaNisiaEvidenceSyncV1';
  const CONNECTED_AT_KEY = 'eviaNisiaConnectedAtV1';
  const COURSE_HASH_KEY = 'eviaNisiaCourseHashV1';
  const COURSE_BACKUP_KEY = 'eviaNisiaPreLinkCourseBackupV1';
  let client = null;
  let bootstrapData = null;
  let syncRunning = false;
  let buttonBound = null;
  let pairingQrMode = false;

  function getClient() {
    if (client) return client;
    if (!window.supabase?.createClient) throw new Error('Nisia connection library is unavailable.');
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: AUTH_STORAGE_KEY,
      },
    });
    return client;
  }

  function readJson(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value ?? fallback; } catch { return fallback; }
  }
  function writeJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function clean(value) { return typeof value === 'string' ? value.trim() : ''; }
  function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

  async function portfolioEntries() {
    try {
      if (typeof getPortfolioEntries === 'function') return await getPortfolioEntries();
    } catch (error) { console.warn('Could not read Evia portfolio for Nisia sync', error); }
    return [];
  }

  async function establishBaseline() {
    if (localStorage.getItem(BASELINE_KEY)) return;
    const entries = await portfolioEntries();
    writeJson(BASELINE_KEY, entries.map((entry) => String(entry?.id || '')).filter(Boolean));
    localStorage.setItem(CONNECTED_AT_KEY, new Date().toISOString());
  }

  function backupCurrentCourseOnce() {
    if (localStorage.getItem(COURSE_BACKUP_KEY)) return;
    const keys = ['eviaNaxosCourse', 'eviaNaxosCourseTitle', 'eviaNaxosCourseMetaV1'];
    const backup = {};
    keys.forEach((key) => { const value = localStorage.getItem(key); if (value !== null) backup[key] = value; });
    writeJson(COURSE_BACKUP_KEY, backup);
  }

  function coursePointerType(pointer) {
    if (clean(pointer?.courseType).toLowerCase() === 'ksb') return 'ksb';
    if (clean(pointer?.courseType).toLowerCase() === 'nvq') return 'nvq';
    if (pointer?.type === 'evia-mapping-pack-url') return 'nvq';
    return 'ksb';
  }

  async function importAssignedCourse(data) {
    const course = data?.course;
    const pointer = course?.source_pointer;
    if (!course || !pointer) return { imported: false, reason: 'The assigned course has not been published from Naxos.' };
    const currentHash = localStorage.getItem(COURSE_HASH_KEY) || '';
    if (course.content_hash && currentHash === course.content_hash) return { imported: false, unchanged: true };

    backupCurrentCourseOnce();
    const type = coursePointerType(pointer);
    if (type === 'nvq') {
      if (typeof importNaxosNvqPack !== 'function') throw new Error('Evia NVQ importer is unavailable.');
      await importNaxosNvqPack(pointer);
    } else {
      if (typeof importNaxosKsbPack !== 'function') throw new Error('Evia KSB importer is unavailable.');
      await importNaxosKsbPack(pointer);
    }
    if (course.content_hash) localStorage.setItem(COURSE_HASH_KEY, course.content_hash);
    return { imported: true };
  }

  async function loadAssignment({ importCourse = true } = {}) {
    const nisia = getClient();
    const { data: sessionData } = await nisia.auth.getSession();
    if (!sessionData?.session) { bootstrapData = null; return null; }
    const { data, error } = await nisia.functions.invoke('evia-bootstrap', { body: {} });
    if (error || !data?.connected) throw new Error(data?.error || 'Nisia could not load this learner assignment.');
    bootstrapData = data;
    writeJson(ASSIGNMENT_KEY, {
      organisation_id: data.organisation_id,
      member_id: data.member_id,
      learner_id: data.learner_id,
      enrolment_id: data.enrolment?.id || null,
      course_id: data.course?.id || null,
      course_title: data.course?.title || '',
      course_code: data.course?.code || '',
      content_hash: data.course?.content_hash || '',
      criterion_codes: (data.criteria || []).map((criterion) => criterion.code).filter(Boolean),
      synced_at: new Date().toISOString(),
    });
    if (importCourse && data.enrolment && data.course) await importAssignedCourse(data);
    await recoverNisiaState(data);
    updateConnectionButton();
    return data;
  }

  function samePath(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, index) => clean(item) === clean(b[index]));
    if (typeof a === 'string' && Array.isArray(b)) return a === b.join(' > ') || a === b.join(' / ');
    if (Array.isArray(a) && typeof b === 'string') return samePath(b, a);
    return clean(a) === clean(b);
  }

  function criterionCodesForEntry(entry) {
    let mappings = null;
    try { if (typeof courseMetaMappings === 'function') mappings = courseMetaMappings(); } catch {}
    if (!mappings || typeof mappings !== 'object') return [];
    const entryPath = Array.isArray(entry?.path) ? entry.path : [];
    const matches = [];
    for (const [code, mapped] of Object.entries(mappings)) {
      const candidates = Array.isArray(mapped) ? mapped : [mapped];
      const pathCandidates = candidates.some((candidate) => Array.isArray(candidate)) ? candidates : [mapped];
      if (pathCandidates.some((candidate) => samePath(candidate, entryPath))) matches.push(code);
    }
    return [...new Set(matches)].filter(Boolean);
  }

  function entryAreaComplete(entry) {
    const path = Array.isArray(entry?.path) ? entry.path : [];
    try {
      if (typeof evidencePathKey === 'function' && typeof completedEvidencePaths !== 'undefined') {
        return completedEvidencePaths.has(evidencePathKey(path));
      }
    } catch {}
    try {
      const key = JSON.stringify(path.map(clean));
      const saved = JSON.parse(localStorage.getItem('eviaCompletedEvidencePathsV1') || '[]');
      return Array.isArray(saved) && saved.includes(key);
    } catch { return false; }
  }

  function evidenceType(entry) {
    const type = clean(entry?.type).toLowerCase();
    const mime = clean(entry?.mimeType).toLowerCase();
    if (type.includes('photo') || mime.startsWith('image/')) return 'photo';
    if (type.includes('video') || mime.startsWith('video/')) return 'video';
    if (type.includes('audio') || mime.startsWith('audio/')) return 'audio';
    if (type.includes('text') || type.includes('written') || mime === 'text/plain') return 'written';
    if (type.includes('document') || type.includes('file') || mime.includes('pdf') || mime.includes('word') || mime.includes('sheet')) return 'document';
    return 'other';
  }

  function evidenceTitle(entry) {
    return clean(entry?.evidenceLabel) || clean(entry?.methodLabel) || clean(entry?.fileName) || `Evia ${evidenceType(entry)} evidence`;
  }

  function fingerprint(entry, codes, areaComplete) {
    return JSON.stringify([
      entry?.id,
      entry?.createdAt,
      entry?.type,
      entry?.mimeType,
      entry?.fileName,
      entry?.blob?.size || 0,
      entry?.path || [],
      evidenceTitle(entry),
      codes,
      areaComplete,
    ]);
  }

  async function shortHash(value) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 28);
  }

  function fileExtension(entry) {
    const fileName = clean(entry?.fileName);
    const match = fileName.match(/(\.[A-Za-z0-9]{1,8})$/);
    if (match) return match[1].toLowerCase();
    const mime = clean(entry?.mimeType).toLowerCase();
    if (mime === 'image/jpeg') return '.jpg';
    if (mime === 'image/png') return '.png';
    if (mime === 'image/webp') return '.webp';
    if (mime === 'video/mp4') return '.mp4';
    if (mime === 'audio/mpeg') return '.mp3';
    if (mime === 'audio/mp4') return '.m4a';
    if (mime === 'application/pdf') return '.pdf';
    if (mime === 'text/plain') return '.txt';
    return '';
  }

  async function syncFile(entry, result) {
    if (!(entry?.blob instanceof Blob) || !entry.blob.size) return true;
    const nisia = getClient();
    const { data: existing, error: existingError } = await nisia
      .from('evidence_files')
      .select('id, storage_path')
      .eq('evidence_id', result.evidence_id)
      .limit(1);
    if (existingError) throw existingError;
    if (existing?.length) return true;

    const name = `${await shortHash(`evia:${entry.id}`)}${fileExtension(entry)}`;
    const storagePath = `${result.storage_path_prefix}${name}`;
    const mimeType = clean(entry.mimeType) || entry.blob.type || 'application/octet-stream';
    const { error: uploadError } = await nisia.storage.from('evidence').upload(storagePath, entry.blob, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadError && !/already exists|duplicate/i.test(uploadError.message || '')) throw uploadError;

    const { error: fileRowError } = await nisia.from('evidence_files').insert({
      organisation_id: result.organisation_id,
      evidence_id: result.evidence_id,
      uploaded_by_member_id: result.member_id,
      storage_path: storagePath,
      mime_type: mimeType,
      size_bytes: entry.blob.size,
    });
    if (fileRowError && !/duplicate|unique/i.test(fileRowError.message || '')) throw fileRowError;
    return true;
  }

  async function syncOne(entry, state) {
    const assignment = bootstrapData || await loadAssignment({ importCourse: false });
    if (!assignment?.enrolment?.id) return false;
    const codes = criterionCodesForEntry(entry);
    const areaComplete = entryAreaComplete(entry);
    const fp = fingerprint(entry, codes, areaComplete);
    if (state[entry.id]?.fingerprint === fp && state[entry.id]?.complete) return false;

    const nisia = getClient();
    const { data, error } = await nisia.functions.invoke('evia-sync-evidence', {
      body: {
        enrolment_id: assignment.enrolment.id,
        client_reference: `evia:${entry.id}`,
        evidence_type: evidenceType(entry),
        title: evidenceTitle(entry),
        criterion_codes: codes,
        path: Array.isArray(entry.path) ? entry.path : [],
        area_complete: areaComplete,
        method: {
          heading: clean(entry.methodHeading),
          label: clean(entry.methodLabel),
          requirements: entry.requirements || null,
        },
        created_at: clean(entry.createdAt),
      },
    });
    if (error || !data?.evidence_id) throw new Error(data?.error || 'Nisia evidence sync failed.');
    await syncFile(entry, data);
    state[entry.id] = { fingerprint: fp, evidence_id: data.evidence_id, complete: true, synced_at: new Date().toISOString(), mapped: data.mapped_criteria };
    return true;
  }

  async function syncNewEvidence({ force = false } = {}) {
    if (syncRunning || !navigator.onLine) return { synced: 0 };
    const nisia = getClient();
    const { data: sessionData } = await nisia.auth.getSession();
    if (!sessionData?.session) return { synced: 0 };
    syncRunning = true;
    let synced = 0;
    try {
      if (!bootstrapData || force) await loadAssignment({ importCourse: true });
      const baseline = new Set(readJson(BASELINE_KEY, []));
      if (!localStorage.getItem(BASELINE_KEY)) await establishBaseline();
      const currentBaseline = new Set(readJson(BASELINE_KEY, []));
      const state = readJson(SYNC_STATE_KEY, {});
      const entries = await portfolioEntries();
      for (const entry of entries) {
        const id = String(entry?.id || '');
        if (!id || currentBaseline.has(id) || baseline.has(id)) continue;
        try { if (await syncOne(entry, state)) { synced += 1; writeJson(SYNC_STATE_KEY, state); } }
        catch (error) { console.warn('Evia evidence remains queued for Nisia', id, error); }
      }
      writeJson(SYNC_STATE_KEY, state);
      return { synced };
    } finally {
      syncRunning = false;
      updateConnectionButton();
    }
  }

  function recoveredLocalId(row) {
    const reference = clean(row?.client_reference);
    return reference.startsWith('evia:') ? reference.slice(5) : `nisia-${clean(row?.id)}`;
  }

  function recoveredType(row) {
    const type = clean(row?.evidence_type).toLowerCase();
    if (type === 'written') return 'text';
    if (type === 'other' && /witness/i.test(clean(row?.title))) return 'witness';
    return type || 'document';
  }

  function recoveredExtension(mime, type) {
    const value = clean(mime).toLowerCase();
    if (value.includes('webm')) return 'webm';
    if (value.includes('mp4')) return type === 'audio' ? 'm4a' : 'mp4';
    if (value.includes('jpeg')) return 'jpg';
    if (value.includes('png')) return 'png';
    if (value.includes('webp')) return 'webp';
    if (value.includes('pdf')) return 'pdf';
    if (value.includes('plain')) return 'txt';
    return type === 'text' ? 'txt' : 'bin';
  }

  function restoreLearnerProfile(data) {
    const displayName = clean(data?.profile?.display_name);
    if (!displayName) return false;
    const current = readJson('eviaLearnerProfile', {});
    if (clean(current?.firstName) || clean(current?.nickname)) return false;
    const parts = displayName.split(/\s+/).filter(Boolean);
    const restored = {
      ...current,
      firstName: parts[0] || displayName,
      lastName: parts.slice(1).join(' '),
      nickname: clean(current?.nickname),
      startDate: clean(current?.startDate) || clean(data?.enrolment?.start_date),
      endDate: clean(current?.endDate) || clean(data?.enrolment?.end_date),
    };
    writeJson('eviaLearnerProfile', restored);
    try { learnerProfile = loadLearnerProfile(); } catch {}
    try {
      if (typeof setSpeech === 'function' && typeof homeSpeechLines === 'function' && !document.getElementById('screen')?.classList.contains('active')) setSpeech(homeSpeechLines());
    } catch {}
    return true;
  }

  function openRecoveryPortfolioDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('EviaPortfolio', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('evidence')) {
          const store = db.createObjectStore('evidence', { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
          store.createIndex('type', 'type');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Portfolio recovery database unavailable'));
    });
  }

  async function putRecoveredPortfolioEntry(entry) {
    const db = await openRecoveryPortfolioDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('evidence', 'readwrite');
      tx.objectStore('evidence').put(entry);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  async function recoveryBlob(file) {
    if (!file?.id) return null;
    const nisia = getClient();
    const { data, error } = await nisia.functions.invoke('secure-evidence-download', { body: { file_id: file.id } });
    if (error || !data?.url) throw new Error('Nisia recovery file could not be authorised.');
    const response = await fetch(data.url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Nisia recovery file could not be downloaded.');
    return response.blob();
  }

  function restoreCompletedPath(row) {
    const metadata = row?.source_metadata && typeof row.source_metadata === 'object' ? row.source_metadata : {};
    if (metadata.area_complete !== true || !Array.isArray(metadata.path) || !metadata.path.length) return;
    const key = JSON.stringify(metadata.path.map(clean));
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem('eviaCompletedEvidencePathsV1') || '[]'); } catch {}
    const next = new Set(Array.isArray(saved) ? saved.filter((item) => typeof item === 'string') : []);
    next.add(key);
    try { localStorage.setItem('eviaCompletedEvidencePathsV1', JSON.stringify([...next])); } catch {}
  }

  async function recoverNisiaState(data) {
    restoreLearnerProfile(data);
    const rows = Array.isArray(data?.recovery_evidence) ? data.recovery_evidence : [];
    if (!rows.length || !('indexedDB' in window)) return { restored: 0 };
    const existingEntries = await portfolioEntries();
    const existingIds = new Set(existingEntries.map((entry) => String(entry?.id || '')).filter(Boolean));
    const baseline = new Set(readJson(BASELINE_KEY, []));
    let restored = 0;

    for (const row of rows) {
      restoreCompletedPath(row);
      const id = recoveredLocalId(row);
      if (!id || existingIds.has(id)) { if (id) baseline.add(id); continue; }
      const metadata = row?.source_metadata && typeof row.source_metadata === 'object' ? row.source_metadata : {};
      const file = Array.isArray(row?.files) ? row.files[0] : null;
      let blob = null;
      try { if (file) blob = await recoveryBlob(file); } catch (error) { console.warn('Nisia evidence file remains available for later recovery', id, error); continue; }
      const type = recoveredType(row);
      const mimeType = clean(file?.mime_type) || blob?.type || (type === 'text' ? 'text/plain' : 'application/octet-stream');
      const title = clean(row?.title) || 'Recovered Evia evidence';
      const entry = {
        id,
        createdAt: clean(metadata.local_created_at) || clean(row?.created_at) || new Date().toISOString(),
        type,
        mimeType,
        fileName: `recovered-${id}.${recoveredExtension(mimeType, type)}`,
        blob: blob || new Blob([], { type: mimeType }),
        path: Array.isArray(metadata.path) ? metadata.path.map(clean).filter(Boolean) : [],
        courseTitle: clean(data?.course?.title),
        evidenceLabel: title,
        methodHeading: clean(metadata?.method?.heading),
        methodLabel: clean(metadata?.method?.label),
        requirements: metadata?.method?.requirements || null,
        recoveredFromNisia: true,
      };
      await putRecoveredPortfolioEntry(entry);
      existingIds.add(id);
      baseline.add(id);
      restored += 1;
    }

    if (baseline.size) writeJson(BASELINE_KEY, [...baseline]);
    try { completedEvidencePaths = loadCompletedEvidencePaths(); } catch {}
    try { updateArchBars().catch(() => {}); } catch {}
    return { restored };
  }

  async function redeemPairingCode(code, onStatus = () => {}) {
    const cleanCode = clean(code);
    if (!cleanCode) throw new Error('No Nisia connection code was supplied.');
    const nisia = getClient();
    await establishBaseline();
    onStatus('Connecting…');
    const { data, error } = await nisia.functions.invoke('evia-redeem-pairing', { body: { pairing_code: cleanCode } });
    if (error || !data?.token_hash) throw new Error(data?.error || 'That connection code could not be used.');
    const { error: verifyError } = await nisia.auth.verifyOtp({ token_hash: data.token_hash, type: 'email' });
    if (verifyError) throw verifyError;
    localStorage.setItem(CONNECTED_AT_KEY, new Date().toISOString());
    onStatus('Connected. Loading assigned course…');
    const assignment = await loadAssignment({ importCourse: true });
    await syncNewEvidence();
    updateConnectionButton();
    return assignment;
  }

  function pairingCodeFromQr(rawValue) {
    try {
      const parsed = JSON.parse(String(rawValue || ''));
      if (parsed?.type !== 'nisia-evia-pairing-v1') return '';
      return clean(parsed?.pairing_code);
    } catch { return ''; }
  }

  function installPairingQrHandler() {
    try {
      if (typeof handleQrRawValue === 'function' && !handleQrRawValue.__nisiaPairing) {
        const original = handleQrRawValue;
        const wrapped = function(rawValue) {
          if (!pairingQrMode) return original.apply(this, arguments);
          const code = pairingCodeFromQr(rawValue);
          if (!code) {
            if (typeof scannerStatus !== 'undefined' && scannerStatus) scannerStatus.textContent = 'That is not a Nisia connection QR. Keep scanning.';
            return false;
          }
          pairingQrMode = false;
          if (typeof scannerStatus !== 'undefined' && scannerStatus) scannerStatus.textContent = 'Connecting to Nisia…';
          redeemPairingCode(code, (status) => { try { if (scannerStatus) scannerStatus.textContent = status; } catch {} })
            .then((assignment) => {
              try { if (scannerStatus) scannerStatus.textContent = assignment?.course ? `Connected · ${assignment.course.title}` : 'Connected to Nisia.'; } catch {}
              setTimeout(() => { try { closeScanner(false); } catch {} }, 650);
            })
            .catch((error) => {
              console.error('Evia QR pairing failed', error);
              pairingQrMode = true;
              try { if (scannerStatus) scannerStatus.textContent = error?.message || 'Nisia could not connect. Try the QR again.'; } catch {}
              try { if (typeof scanFrame === 'function') requestAnimationFrame(scanFrame); } catch {}
            });
          return true;
        };
        wrapped.__nisiaPairing = true;
        handleQrRawValue = wrapped;
      }
    } catch {}
  }

  function installCompletionSyncHook() {
    try {
      if (typeof markEvidencePathComplete === 'function' && !markEvidencePathComplete.__nisiaCompletionSync) {
        const originalMark = markEvidencePathComplete;
        const wrappedMark = function() {
          const result = originalMark.apply(this, arguments);
          queueMicrotask(() => syncNewEvidence({ force: true }).catch(() => {}));
          return result;
        };
        wrappedMark.__nisiaCompletionSync = true;
        markEvidencePathComplete = wrappedMark;
      }
    } catch {}
    try {
      if (typeof clearEvidencePathComplete === 'function' && !clearEvidencePathComplete.__nisiaCompletionSync) {
        const originalClear = clearEvidencePathComplete;
        const wrappedClear = function() {
          const result = originalClear.apply(this, arguments);
          queueMicrotask(() => syncNewEvidence({ force: true }).catch(() => {}));
          return result;
        };
        wrappedClear.__nisiaCompletionSync = true;
        clearEvidencePathComplete = wrappedClear;
      }
    } catch {}
  }

  function createModal() {
    const overlay = document.createElement('div');
    overlay.id = 'eviaNisiaModal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.38);display:grid;place-items:center;padding:20px';
    const card = document.createElement('div');
    card.style.cssText = 'width:min(100%,390px);max-height:85vh;overflow:auto;background:#fff;border-radius:24px;padding:20px;display:grid;gap:12px;box-shadow:0 20px 60px rgba(0,0,0,.18);font-family:inherit;color:#202020';
    overlay.appendChild(card);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    return { overlay, card };
  }

  function modalButton(text, primary = false) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = text;
    button.style.cssText = `min-height:44px;border:${primary ? '0' : '1px solid #ddd'};border-radius:999px;padding:0 15px;font:inherit;font-weight:750;background:${primary ? '#222' : '#fff'};color:${primary ? '#fff' : '#222'}`;
    return button;
  }

  async function showConnectionModal() {
    const nisia = getClient();
    const { data: sessionData } = await nisia.auth.getSession();
    const { overlay, card } = createModal();
    const title = document.createElement('h2'); title.textContent = sessionData?.session ? 'Nisia connected' : 'Connect Evia to Nisia'; title.style.margin = '0'; card.appendChild(title);
    const note = document.createElement('p'); note.style.cssText = 'margin:0;line-height:1.45;font-size:14px;color:#666'; card.appendChild(note);

    if (!sessionData?.session) {
      note.textContent = 'Scan the one-time QR shown for this learner in Nisia. You can still enter the code manually if needed.';
      const message = document.createElement('p'); message.style.cssText = 'margin:0;font-size:13px;line-height:1.4'; card.appendChild(message);
      const scan = modalButton('Scan Nisia QR', true); card.appendChild(scan);
      scan.addEventListener('click', () => {
        pairingQrMode = true;
        overlay.remove();
        try {
          installPairingQrHandler();
          startScanner();
          setTimeout(() => { try { if (scannerStatus) scannerStatus.textContent = 'Scan the Nisia connection QR shown for this learner.'; } catch {} }, 80);
        } catch (error) {
          pairingQrMode = false;
          console.error('Nisia QR scanner could not open', error);
          showConnectionModal().catch(() => {});
        }
      });

      const fallback = document.createElement('div'); fallback.style.cssText = 'display:grid;gap:8px;padding-top:4px;border-top:1px solid #eee'; card.appendChild(fallback);
      const fallbackLabel = document.createElement('p'); fallbackLabel.textContent = 'Manual code fallback'; fallbackLabel.style.cssText = 'margin:0;font-size:12px;color:#777;font-weight:700'; fallback.appendChild(fallbackLabel);
      const input = document.createElement('input'); input.type = 'text'; input.inputMode = 'text'; input.autocomplete = 'one-time-code'; input.placeholder = 'XXXXX-XXXXX-XXXXX'; input.maxLength = 17; input.style.cssText = 'min-height:48px;border:1px solid #ccc;border-radius:14px;padding:0 12px;font:inherit;text-transform:uppercase;letter-spacing:.04em'; fallback.appendChild(input);
      const connect = modalButton('Connect with code'); fallback.appendChild(connect);
      connect.addEventListener('click', async () => {
        const code = input.value.trim(); if (!code) return;
        connect.disabled = true;
        try {
          const assignment = await redeemPairingCode(code, (status) => { message.textContent = status; });
          message.textContent = assignment?.course ? `Connected · ${assignment.course.title}` : 'Connected · no course assigned yet.';
          await sleep(700); overlay.remove();
        } catch (error) {
          console.error('Evia pairing failed', error); message.textContent = error?.message || 'Evia could not connect to Nisia.'; connect.disabled = false;
        }
      });
    } else {
      const assignment = readJson(ASSIGNMENT_KEY, {});
      note.textContent = assignment?.course_title ? `Assigned course: ${assignment.course_title}. Nisia is also available as a recovery copy for synced Evia evidence.` : 'Evia is linked to Nisia. No Naxos-published course is currently assigned.';
      const message = document.createElement('p'); message.style.cssText = 'margin:0;font-size:13px;line-height:1.4'; card.appendChild(message);
      const sync = modalButton('Sync now', true); card.appendChild(sync);
      sync.addEventListener('click', async () => {
        sync.disabled = true; message.textContent = 'Syncing…';
        try { const result = await syncNewEvidence({ force: true }); const fresh = readJson(ASSIGNMENT_KEY, {}); message.textContent = `${result.synced} evidence update${result.synced === 1 ? '' : 's'} synced${fresh.course_title ? ` · ${fresh.course_title}` : ''}.`; }
        catch (error) { message.textContent = error?.message || 'Sync could not complete.'; }
        finally { sync.disabled = false; }
      });
      const disconnect = modalButton('Disconnect Nisia'); card.appendChild(disconnect);
      disconnect.addEventListener('click', async () => {
        await nisia.auth.signOut(); bootstrapData = null; localStorage.removeItem(ASSIGNMENT_KEY); overlay.remove(); updateConnectionButton();
      });
    }
    const close = modalButton('Close'); card.appendChild(close); close.addEventListener('click', () => overlay.remove());
  }

  async function isConnected() {
    try { const { data } = await getClient().auth.getSession(); return Boolean(data?.session); } catch { return false; }
  }

  async function updateConnectionButton() {
    const button = document.getElementById('uploadPortfolio');
    if (!button) return;
    const connected = await isConnected();
    button.textContent = connected ? 'Sync with Nisia' : 'Connect Nisia';
  }

  function bindConnectionButton() {
    const button = document.getElementById('uploadPortfolio');
    if (!button || buttonBound === button) return;
    buttonBound = button;
    button.addEventListener('click', (event) => {
      event.preventDefault(); event.stopImmediatePropagation(); showConnectionModal().catch((error) => console.error('Could not open Nisia connection', error));
    }, true);
    updateConnectionButton();
  }

  async function developerConnectionStatus() {
    const connected = await isConnected();
    const assignment = readJson(ASSIGNMENT_KEY, {});
    const state = readJson(SYNC_STATE_KEY, {});
    const baseline = new Set(readJson(BASELINE_KEY, []));
    const entries = await portfolioEntries();
    const tracked = Object.keys(state || {});
    const queuedEvidence = entries.filter((entry) => {
      const id = String(entry?.id || '');
      return id && !baseline.has(id) && !state[id]?.complete;
    }).length;
    const syncTimes = Object.values(state || {})
      .map((item) => new Date(item?.synced_at || 0).getTime())
      .filter(Number.isFinite);
    let serverOk = false;
    if (connected && navigator.onLine) {
      try {
        const { data, error } = await getClient().functions.invoke('evia-bootstrap', { body: {} });
        serverOk = !error && Boolean(data?.connected);
      } catch {}
    }
    return {
      connected,
      serverOk,
      assignmentPresent: Boolean(assignment?.learner_id || assignment?.enrolment_id),
      queuedEvidence,
      trackedEvidence: tracked.length,
      lastSync: syncTimes.length ? new Date(Math.max(...syncTimes)).toISOString() : '',
      recoveryAvailable: serverOk,
    };
  }

  async function developerResetConnection() {
    try { await getClient().auth.signOut(); } catch {}
    bootstrapData = null;
    [AUTH_STORAGE_KEY, ASSIGNMENT_KEY, BASELINE_KEY, SYNC_STATE_KEY, CONNECTED_AT_KEY, COURSE_HASH_KEY, COURSE_BACKUP_KEY]
      .forEach((key) => { try { localStorage.removeItem(key); } catch {} });
    updateConnectionButton();
    return true;
  }

  window.__eviaNisiaDeveloper = Object.freeze({
    status: developerConnectionStatus,
    forceSync: () => syncNewEvidence({ force: true }),
    resetConnection: developerResetConnection,
  });

  async function boot() {
    installCompletionSyncHook();
    installPairingQrHandler();
    bindConnectionButton();
    const observer = new MutationObserver(() => bindConnectionButton());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('online', () => syncNewEvidence({ force: true }).catch(() => {}));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNewEvidence({ force: true }).catch(() => {}); });
    setInterval(() => syncNewEvidence().catch(() => {}), 30000);

    try {
      const connected = await isConnected();
      if (connected) {
        await loadAssignment({ importCourse: true });
        if (!localStorage.getItem(BASELINE_KEY)) await establishBaseline();
        await syncNewEvidence();
      }
    } catch (error) { console.warn('Nisia connection will retry when online', error); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();