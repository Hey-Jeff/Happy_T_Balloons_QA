import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const script = new URL('./check-env.mjs', import.meta.url).pathname;
const run = (url) => spawnSync(process.execPath, [script], {
 encoding: 'utf8',
env: {
  ...process.env,
  QA_BASE_URL: url,
  QA_ALLOW_HTTP: 'false'
}
});

test('QA_BASE_URL no configurada produce error útil', () => {
  const r = run('');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Falta el secreto QA_BASE_URL/);
});
test('Se bloquea localhost en runners de GitHub', () => {
  const r = run('http://localhost:3000');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /localhost/);
});
test('La URL con subruta se rechaza (selectores absolutos)', () => {
  const r = run('https://qa.example.com/sistema');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /raíz del sitio/);
});
test('HTTPS es obligatorio por defecto en una web publicada', () => {
  const r = run('http://qa.example.com');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /HTTPS/);
});
