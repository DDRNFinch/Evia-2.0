const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('EPA uses the actual homepage Evia instance and keeps readable EPA contrast', async () => {
  const main = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const fix = fs.readFileSync(path.join(root, 'evia-approved-epa-ui-fix-v1.js'), 'utf8');

  expect(main).toContain('<div class="evia-float">');
  expect(main).toContain('<div class="evia-character" id="evia"');
  expect(main).toContain('<div class="evia-body">');
  expect(main).toContain('<div class="eyes">');
  expect(main).toContain('<span class="eye"></span>');

  expect(fix).toContain("document.getElementById('eviaStage')");
  expect(fix).toContain("el.classList?.contains('evia-float')");
  expect(fix).toContain("oldAvatar.replaceWith(host)");
  expect(fix).toContain("host.appendChild(float)");
  expect(fix).toContain("stage.appendChild(float)");
  expect(fix).not.toContain('border:3px solid var(--evia-yellow');
  expect(fix).not.toContain('.evia-epa-eye-v2{');

  expect(fix).toContain('background:rgba(250,249,242,.98)!important');
  expect(fix).toContain('color:#333!important');
  expect(fix).toContain('.epa-v2-card>strong{color:#fff7d2!important;}');
  expect(fix).toContain('.epa-v2-btn{color:#f5e7a9!important;}');
});
