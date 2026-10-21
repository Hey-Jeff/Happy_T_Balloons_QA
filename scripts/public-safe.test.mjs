
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { publicDraftIds } from './public-safe.mjs';
import { cases } from './qa-core.mjs';

const run = (...args) => spawnSync(
  process.execPath,
  [new URL('./qa.mjs', import.meta.url).pathname, ...args],
  {
    encoding: 'utf8',
    env: {
      ...process.env,
      QA_BASE_URL: 'http://13.184.33.122',
      QA_ALLOW_HTTP: 'true',
      QA_ALLOW_HTTP_AUTH: 'false'
    }
  }
);

test('La lista pública contiene cinco borradores', () => {
  assert.deepEqual(
    [...publicDraftIds],
    ['CAT-001', 'CAT-002', 'CAT-004', 'CAT-006', 'CLI-006']
  );

  for (const id of publicDraftIds) {
    assert.equal(
      cases.find(c => c.id === id)?.automation_status,
      'draft_requires_ui_verification'
    );
  }
});

test('Se bloquea autenticación HTTP sin autorización', () => {
  const r = run('run', 'case', 'AUT-001', '--try-drafts');

  assert.equal(r.status, 3);
  assert.match(r.stderr, /Autenticación HTTP bloqueada/);
});

test('Se bloquea módulo autenticado sin autorización', () => {
  const r = run(
    'run',
    'module',
    'PRO',
    '--try-drafts',
    '--allow-pending'
  );

  assert.equal(r.status, 3);
  assert.match(r.stderr, /Autenticación HTTP bloqueada/);
});

test('La cobertura no depende de la URL', () => {
  const r = run('coverage');

  assert.equal(r.status, 0);
  assert.match(r.stdout, /total\s+105/);
});
