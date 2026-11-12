const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { escapeHtml } = require('../js/html_escape.js');

test('escapeHtml neutraliza etiquetas y comillas', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(escapeHtml("O'Higgins & Cia"), 'O&#39;Higgins &amp; Cia');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(12), '12');
});

test('hay una sola definicion de escapeHtml en el frontend', () => {
  const jsDir = path.join(__dirname, '..', 'js');
  const definitions = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js')).filter((f) => {
    const s = fs.readFileSync(path.join(jsDir, f), 'utf8');
    return /function escapeHtml\s*\(|escapeHtml\s*=\s*function/.test(s);
  });
  assert.deepEqual(definitions, ['html_escape.js']);
});
