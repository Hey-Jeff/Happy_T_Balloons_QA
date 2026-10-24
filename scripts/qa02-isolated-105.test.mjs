import test from 'node:test';
import assert from 'node:assert/strict';
import { cases } from './qa-core.mjs';
import {
  ISOLATED_CONFIRMATION, verifyIsolatedEnvironment, makeIsolatedPlan,
  countIsolated, REQUIRED_FIXTURES, isSuccessfulPlaywrightRun
} from './qa02-isolated-105.mjs';
const safeEnv={
  QA_BASE_URL:'https://qa.example.test',
  QA_ISOLATED_BASE_URL:'https://qa.example.test',
  QA_ISOLATED_QA:'true', QA_ALLOW_MUTATIONS:'true', QA_RESETTABLE_DB:'YES',
  QA_NO_REAL_TRANSACTIONS:'true', QA_ISOLATED_CONFIRMATION:ISOLATED_CONFIRMATION,
  QA_ADMIN_EMAIL:'admin@qa.example.test', QA_ADMIN_PASSWORD:'redacted',
  QA_CLIENT_EMAIL:'cliente@qa.example.test', QA_CLIENT_PASSWORD:'redacted'
};
test('Bloquea cualquier escritura sin confirmación y URL aislada HTTPS exacta',()=>{
  assert.deepEqual(verifyIsolatedEnvironment(safeEnv),[]);
  for(const [k,v] of [
    ['QA_ISOLATED_CONFIRMATION',''],['QA_RESETTABLE_DB','NO'],
    ['QA_ISOLATED_QA','false'],['QA_ALLOW_MUTATIONS','false'],
    ['QA_NO_REAL_TRANSACTIONS','false'],['QA_ALLOW_HTTP','true'],
    ['QA_BASE_URL','http://13.184.33.122'],['QA_BASE_URL','https://13.184.33.122'],
    ['QA_BASE_URL','https://example.com'],['QA_BASE_URL','https://qa.example.test/pedido']
  ]) assert.notDeepEqual(verifyIsolatedEnvironment({...safeEnv,[k]:v}),[],`${k}=${v}`);
});
test('58 casos clasificados sin inventar PASS ni ejecutar acciones de escritura por defecto',()=>{
  const entries=makeIsolatedPlan(cases,{});
  assert.equal(entries.length,58);
  assert.equal(new Set(entries.map(c=>c.id)).size,58);
  const count=countIsolated(entries);
  assert.equal(count['N/A']||0,0);
  assert.equal(count.PENDING||0,0);
  assert.equal(count.PASS||0,0);
  assert.equal(entries.find(x=>x.id==='AUT-002').status,'BLOCKED');
  assert.equal(entries.find(x=>x.id==='CATE-012').status,'BLOCKED');
  assert.ok(entries.find(x=>x.id==='CAT-001').status==='QUEUED');
});
test('Sólo fixtures explícitos habilitan los casos que modifican datos',()=>{
  const missing=makeIsolatedPlan(cases,{}).find(x=>x.id==='CATE-012');
  assert.match(missing.reason,/QA_CATEGORY_WITH_PRODUCTS/);
  const fixture=Object.fromEntries(REQUIRED_FIXTURES['CATE-012'].map(x=>[x,'qa_value']));
  assert.equal(makeIsolatedPlan(cases,fixture).find(x=>x.id==='CATE-012').status,'QUEUED');
});
test('Resultado Playwright real sigue siendo la única fuente de PASS',()=>{
  const make=status=>({suites:[{specs:[{tests:[{results:[{status}]}]}]}]});
  assert.equal(isSuccessfulPlaywrightRun(make('passed'),0).status,'PASS');
  assert.equal(isSuccessfulPlaywrightRun(make('skipped'),0).status,'BLOCKED');
  assert.equal(isSuccessfulPlaywrightRun(make('failed'),1).status,'FAIL');
  assert.equal(isSuccessfulPlaywrightRun(null,0).status,'FAIL');
});
