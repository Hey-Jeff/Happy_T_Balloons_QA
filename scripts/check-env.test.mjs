import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./check-env.mjs', import.meta.url));
const run = (url, extra = {}) => spawnSync(process.execPath, [script], {
 encoding: 'utf8',
env: {
  ...process.env,
  QA_BASE_URL: url,
  QA_ALLOW_HTTP: 'false',
  ...extra
}
});

test('Fallo de red transitorio: reintenta un número limitado de veces y luego informa el error', () => {
  // 127.0.0.2:9 no escucha (y no es el "localhost" bloqueado): error de red inmediato, sin salir a internet.
  const r = run('http://127.0.0.2:9', { QA_ALLOW_HTTP: 'true', QA_PRECHECK_ATTEMPTS: '3', QA_PRECHECK_WAIT_MS: '0' });
  assert.notEqual(r.status, 0);
  assert.equal((r.stderr.match(/Intento \d\/3/g) || []).length, 2, r.stderr);
  assert.match(r.stderr, /No hay conectividad al sitio QA/);
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
