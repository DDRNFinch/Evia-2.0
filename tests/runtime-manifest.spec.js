const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function runtimeScripts() {
  const source = fs.readFileSync(path.join(root, 'evia-runtime-manifest.js'), 'utf8');
  const context = {};
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'evia-runtime-manifest.js' });
  return Array.from(context.EVIA_RUNTIME_SCRIPTS || []);
}

function cleanRuntimePath(value) {
  return String(value || '').replace(/^\.\//, '').split('?')[0];
}

test('runtime manifest is unique and every current runtime file exists', async () => {
  const scripts = runtimeScripts();
  expect(scripts.length).toBeGreaterThan(30);
  expect(new Set(scripts).size).toBe(scripts.length);

  for (const script of scripts) {
    expect(script.startsWith('./')).toBeTruthy();
    expect(fs.existsSync(path.join(root, cleanRuntimePath(script))), `missing ${script}`).toBeTruthy();
  }
});

test('service worker uses the current runtime manifest only for caching', async () => {
  const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  expect(worker).toContain("importScripts('./evia-runtime-manifest.js')");
  expect(worker).toContain("const C='evia-pwa-v91'");
  expect(worker).toContain("const RELEASE_VERSION='1.2'");
  expect(worker).not.toContain('injectFeatures(');
  expect(worker).not.toContain('client.navigate(');
  expect(worker).not.toContain('__evia_refresh');
  expect(worker).not.toMatch(/const\s+RUNTIME_SCRIPTS\s*=\s*\[/);
});

test('clean page boot is sourced from the manifest and contains no superseded Attend Learn runtime', async () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const manifest = runtimeScripts().map(cleanRuntimePath);

  expect(html).toContain('./evia-runtime-manifest.js?v=91');
  expect(html).toContain('EVIA_RUNTIME_SCRIPTS');
  expect(html).not.toContain('evia-approved-attend-learn-render-v4.js');
  expect(html).not.toContain('evia-approved-attend-learn-final-v5.js');
  expect(manifest).toContain('evia-attend-learn.js');
  expect(manifest).toContain('evia-approved-6570-05-completion-rules-v1.js');
  expect(manifest).not.toContain('evia-approved-attend-learn-render-v4.js');
  expect(manifest).not.toContain('evia-approved-attend-learn-final-v5.js');
});

test('EPA MCQ bank fix loads after the EPA zone', async () => {
  const manifest = runtimeScripts().map(cleanRuntimePath);
  const v1 = manifest.indexOf('evia-approved-menu-epa-practice-v1.js');
  const ask = manifest.indexOf('evia-approved-ai-ask-v1.js');
  const demo = manifest.indexOf('evia-approved-demo-teach-test-v1.js');
  const uiFix = manifest.indexOf('evia-approved-epa-ui-fix-v1.js');
  const v2 = manifest.indexOf('evia-approved-epa-zone-v2.js');
  const mcqFix = manifest.indexOf('evia-approved-epa-mcq-bank-fix-v1.js');
  expect(v1).toBeGreaterThan(ask);
  expect(demo).toBeGreaterThan(v1);
  expect(uiFix).toBeGreaterThan(demo);
  expect(v2).toBe(uiFix + 1);
  expect(mcqFix).toBe(v2 + 1);
  expect(mcqFix).toBe(manifest.length - 1);
});

test('release version is aligned across worker update UI and release metadata', async () => {
  const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  const updates = fs.readFileSync(path.join(root, 'evia-approved-updates-stable-v1.js'), 'utf8');
  const release = JSON.parse(fs.readFileSync(path.join(root, 'evia-release.json'), 'utf8'));
  expect(worker).toContain(`const RELEASE_VERSION='${release.version}'`);
  expect(updates).toContain(`const CURRENT_VERSION='${release.version}'`);
});

test('current PWA manifest keeps its install scope and referenced icon assets', async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  expect(manifest.name).toBe('Evia');
  expect(manifest.id).toBe('/Evia-2.0/');
  expect(manifest.start_url).toBe('/Evia-2.0/');
  expect(manifest.scope).toBe('/Evia-2.0/');
  expect(manifest.display).toBe('standalone');

  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  expect(icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: '/Evia-2.0/icons/evia-192.png', sizes: '192x192', purpose: 'any' }),
    expect.objectContaining({ src: '/Evia-2.0/icons/evia-512.png', sizes: '512x512', purpose: 'any maskable' })
  ]));

  for (const icon of icons) {
    const local = String(icon.src || '').replace(/^\/Evia-2\.0\//, '');
    expect(fs.existsSync(path.join(root, local)), `missing PWA icon ${icon.src}`).toBeTruthy();
  }
});
