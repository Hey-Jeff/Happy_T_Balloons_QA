import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makePlan, count, exitCodeFor, classifyPlaywrightJSON, firstErrorLine, AUTH_SAFE, PUBLIC_SAFE, BLOCKED_REASONS} from './qa02-all-105.mjs';

const report=status=>({suites:[{specs:[{tests:[{results:[{status}]}]}]}]});
test('Matriz integral: 58 IDs únicos, 56 ejecutables sin mutaciones y 2 bloqueados con motivo',()=>{
  const plan=makePlan();
  assert.equal(plan.length,58);
  assert.equal(new Set(plan.map(x=>x.id)).size,58);
  assert.deepEqual(count(plan),{QUEUED:56,BLOCKED:2});
  assert.equal(PUBLIC_SAFE.length,17);
  assert.equal(AUTH_SAFE.length,39);
  assert.ok(plan.some(x=>x.id==='CAT-002'&&x.status==='QUEUED'));
  assert.ok(plan.some(x=>x.id==='CAT-008'&&x.status==='QUEUED'));
  for(const id of ['AUT-002','CATE-012']){
    const e=plan.find(x=>x.id===id);
    assert.equal(e.status,'BLOCKED',id);
    assert.equal(e.reason,BLOCKED_REASONS[id],id);
  }
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
test('Solo FAIL marca la ejecución en rojo; BLOCKED, PENDING y N/A no',()=>{
  const e=statuses=>statuses.map((status,i)=>({id:`X-${i}`,status}));
  assert.equal(exitCodeFor(e(['PASS','BLOCKED','PENDING','N/A'])),0);
  assert.equal(exitCodeFor(e(['PASS','FAIL','BLOCKED'])),1);
});
test('El FAIL publica la primera línea del error (sin ANSI) para diagnosticar desde el resumen',()=>{
  const failed={suites:[{specs:[{tests:[{results:[{status:'failed',errors:[{message:'\u001b[31mError: Catálogo público: faltan elementos\u001b[39m\n\nExpected: []\nReceived: ["x"]'}]}]}]}]}]};
  const r=classifyPlaywrightJSON(failed,1);
  assert.equal(r.status,'FAIL');
  assert.equal(r.reason,'Aserción fallida o error de ejecución: Error: Catálogo público: faltan elementos');
  assert.doesNotMatch(r.reason,/Received/);
  assert.equal(firstErrorLine([{status:'failed'}]),'');
  assert.equal(firstErrorLine([{errors:[{message:'x'.repeat(500)}]}]).length,140);
});
test('Los casos con sesión no adjuntan snapshots de página y los motivos BLOCKED no publican correos',()=>{
  const src=readFileSync(new URL('./qa02-all-105.mjs',import.meta.url),'utf8');
  assert.match(src,/isAuth\?\{PLAYWRIGHT_NO_COPY_PROMPT:'1'\}:\{\}/);
  for(const reason of Object.values(BLOCKED_REASONS))assert.doesNotMatch(reason,/@/);
});
