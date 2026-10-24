import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { publicDraftIds } from './public-safe.mjs';
import { cases } from './qa-core.mjs';

const run = (...args) => spawnSync(process.execPath,
  [fileURLToPath(new URL('./qa.mjs', import.meta.url)), ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      QA_BASE_URL: 'http://13.184.33.122',
      QA_ALLOW_HTTP: 'true',
      QA_ALLOW_HTTP_AUTH: 'false'
    }
  });

test('Diecisiete casos anonimos y carrito de sesion explicitamente seguros', () => {
  assert.deepEqual([...publicDraftIds], [
    'CAT-001','CAT-002','CAT-003','CAT-004','CAT-005','CAT-006',
    'CAT-008','CAT-011','CAT-012','CLI-002','CLI-003','CLI-006','PRO-006','PED-001','PED-002','PED-003',
    'AUT-005'
  ]);
  for (const id of publicDraftIds) {
    assert.equal(cases.find(c => c.id === id)?.automation_status,
      'draft_requires_ui_verification');
  }
});

test('AUT-001 requiere autorización HTTP explícita', () => {
  const r=run('run','case','AUT-001','--try-drafts');
  assert.equal(r.status,3);
  assert.match(r.stderr,/BLOQUEADO: HTTP autenticado SOLO/i);
});

test('Los casos administrativos permanecen bloqueados en HTTP sin autorización', () => {
  const r=run('run','case','PRO-005','--try-drafts');
  assert.equal(r.status,3);
  assert.match(r.stderr,/BLOQUEADO: HTTP autenticado SOLO/i);
});

test('La cobertura histórica no depende de la URL', () => {
  const r=run('coverage');
  assert.equal(r.status,0);
  assert.match(r.stdout,/total\s+58/);
});
