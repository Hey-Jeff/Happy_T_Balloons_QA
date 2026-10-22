import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cases, statuses } from './qa-core.mjs';
import { temporaryHttpAuthCaseIds } from './http-auth-policy.mjs';
const ids=['CAT-009','CATE-006','ENV-002','CLI-004','CLI-005'];
const flow=readFileSync(new URL('../tests/flows/qa02-readonly-wave5.js', import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/qa02-http-5-nuevos.yml',import.meta.url),'utf8');
const spec=readFileSync(new URL('../tests/qa02.spec.js',import.meta.url),'utf8');
test('Cinco casos clasificados como drafts, autenticados y distintos',()=>{
  assert.equal(new Set(ids).size,5);
  for(const id of ids){
    assert.equal(cases.find(c=>c.id===id)?.automation_status,statuses.draft,id);
    assert.ok(temporaryHttpAuthCaseIds.includes(id),id);
    assert.match(flow,new RegExp(`'${id}':`));
    assert.ok(workflow.includes(id),id);
  }
  assert.match(spec,/\.\.\.qa02ReadOnlyWave5/);
});
test('No convertir faltantes en PASS, no ocultar fallos y no publicar artefactos',()=>{
  assert.match(flow,/testInfo\.skip\(true,/);
  assert.match(workflow,/BLOCKED \/ falta precondicion/);
  assert.match(workflow,/PASS exploratorio/);
  assert.match(workflow,/FAIL \/ revisar error/);
  assert.match(workflow,/QA_ALLOW_MUTATIONS: 'false'/);
  assert.doesNotMatch(workflow,/upload-artifact|QA_ALLOW_MUTATIONS: 'true'/);
  assert.doesNotMatch(flow,/\.post\(|\.put\(|\.delete\(|ConfirmarPedido|CambiarDisponibilidad/);
});
