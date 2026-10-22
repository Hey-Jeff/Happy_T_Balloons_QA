import test from 'node:test';
import assert from 'node:assert/strict';
import {makePlan, count, classifyPlaywrightJSON, AUTH_SAFE, PUBLIC_SAFE} from './qa02-all-105.mjs';

const report=status=>({suites:[{specs:[{tests:[{results:[{status}]}]}]}]});
test('Matriz integral: 105 IDs únicos, 43 ejecutables sin mutaciones, 53 bloqueados, 1 pendiente y 8 N/A',()=>{
  const plan=makePlan();
  assert.equal(plan.length,105);
  assert.equal(new Set(plan.map(x=>x.id)).size,105);
  assert.deepEqual(count(plan),{QUEUED:43,BLOCKED:53,PENDING:1,'N/A':8});
  assert.equal(PUBLIC_SAFE.length,14);
  assert.equal(AUTH_SAFE.length,29);
  assert.ok(plan.some(x=>x.id==='CAT-002'&&x.status==='QUEUED'));
  assert.ok(plan.some(x=>x.id==='CAT-008'&&x.status==='QUEUED'));
  assert.ok(plan.some(x=>x.id==='ENV-011'&&x.status==='PENDING'));
});
test('Nunca transformar SKIPPED/fixture ausente en PASS',()=>{
  assert.equal(classifyPlaywrightJSON(report('skipped'),0).status,'BLOCKED');
  assert.equal(classifyPlaywrightJSON(report('passed'),0).status,'PASS');
  assert.equal(classifyPlaywrightJSON(report('failed'),1).status,'FAIL');
  assert.equal(classifyPlaywrightJSON(report('passed'),1).status,'FAIL');
  assert.equal(classifyPlaywrightJSON(null,0).status,'FAIL');
  assert.equal(classifyPlaywrightJSON({suites:[]},0).status,'FAIL');
});
test('El clasificador distingue un caso con resultado omitido, aunque Playwright termine cero',()=>{
  const skipped={suites:[{specs:[{tests:[{status:'skipped',results:[]}]}]}]};
  assert.equal(classifyPlaywrightJSON(skipped,0).status,'BLOCKED');
});
