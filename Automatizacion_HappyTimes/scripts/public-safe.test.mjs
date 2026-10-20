import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { publicDraftIds } from './public-safe.mjs';
import { cases } from './qa-core.mjs';

const run = (...args) => spawnSync(process.execPath, [new URL('./qa.mjs', import.meta.url).pathname, ...args], {
  encoding: 'utf8', env: {...process.env, QA_BASE_URL:'http://13.184.33.122', QA_ALLOW_HTTP:'true'}
});
test('La lista pública contiene únicamente cinco borradores definidos',()=>{
  assert.deepEqual([...publicDraftIds], ['CAT-001','CAT-002','CAT-004','CAT-006','CLI-006']);
  for(const id of publicDraftIds) assert.equal(cases.find(c=>c.id===id)?.automation_status,'draft_requires_ui_verification');
});
test('Un caso con autenticación se bloquea ANTES de abrir Playwright',()=>{
  const r=run('run','case','AUT-001','--try-drafts');
  assert.equal(r.status,3);
  assert.match(r.stderr,/SEGURIDAD/);
});
test('El módulo de productos autenticado se bloquea en HTTP',()=>{
  const r=run('run','module','PRO','--try-drafts','--allow-pending');
  assert.equal(r.status,3);
  assert.match(r.stderr,/PRO-004/);
});
test('La cobertura de casos no depende de la URL',()=>{
  const r=run('coverage');
  assert.equal(r.status,0);
  assert.match(r.stdout,/total\s+105/);
});
