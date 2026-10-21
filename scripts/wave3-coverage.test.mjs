import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { cases, implemented, statuses } from './qa-core.mjs';
import { publicDraftIds } from './public-safe.mjs';
const source=fs.readFileSync(new URL('../tests/flows/wave3-72h.js',import.meta.url),'utf8');
const ids=[...source.matchAll(/'([A-Z]{3,4}-\d{3})':\s*async/g)].map(m=>m[1]);
test('Ola 3: flujo, matriz y manifiesto tienen los mismos casos',()=>{
  assert.equal(ids.length,22);
  assert.equal(new Set(ids).size,ids.length);
  for(const id of ids){
    assert.ok(implemented.has(id),`No registrado: ${id}`);
    assert.equal(cases.find(c=>c.id===id)?.automation_status,statuses.draft);
    assert.ok(!publicDraftIds.has(id),`Requiere precondiciones: ${id} no debe ser automatico publico`);
  }
});
test('Ola 3: operaciones persistentes bloqueadas sin dos banderas',()=>{
  assert.match(source,/QA_ISOLATED_QA !== 'true' \|\| process\.env\.QA_ALLOW_MUTATIONS !== 'true'/);
});
