import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cases, statuses } from './qa-core.mjs';
import { temporaryHttpAuthCaseIds, temporaryHttpAuthAllowed } from './http-auth-policy.mjs';
const wf = readFileSync(new URL('../.github/workflows/qa02-http-38.yml', import.meta.url), 'utf8');
const spec = readFileSync(new URL('../tests/qa02.spec.js', import.meta.url), 'utf8');
const extensions = readFileSync(new URL('../tests/flows/qa02-safe-extensions.js', import.meta.url), 'utf8');
const added = ['PRO-002','CATE-003','ENV-012','ENV-001','ENV-003','ENV-006'];

test('Seis casos nuevos: catalogados, unicos y autorizados individualmente en QA HTTP', () => {
  assert.equal(new Set(added).size,6);
  for (const id of added) {
    assert.equal(cases.find(c => c.id === id)?.automation_status, statuses.draft, id);
    assert.ok(temporaryHttpAuthCaseIds.includes(id),id);
    assert.equal(temporaryHttpAuthAllowed({baseUrl:'http://13.184.33.122',allowHttp:'true',allowHttpAuth:'true',mode:'case',caseIds:[id]}),true,id);
    assert.ok(wf.includes(id),id);
  }
});
test('Flujo ENV-006 valida respuesta JSON de fecha prohibida y no modifica datos', () => {
  assert.match(extensions,/['"]ENV-006['"]:/);
  assert.match(extensions,/fecha=2000-01-01/);
  assert.match(extensions,/response\.status\(\)/);
  assert.match(extensions,/response\.json\(\)/);
  assert.doesNotMatch(extensions,/\.post\(|\.put\(|\.delete\(|\.fill\(/);
  assert.match(spec,/\.\.\.safeHttpFlows/);
});
test('Workflow preserva acceso individual y no habilita operaciones persistentes', () => {
  assert.match(wf,/QA_ALLOW_MUTATIONS: 'false'/);
  assert.match(wf,/QA_ISOLATED_QA: 'false'/);
  assert.match(wf,/QA_ALLOW_HTTP_AUTH=true npm run test:case/);
  assert.match(wf,/QA_ALLOW_HTTP_AUTH=false npm run test:case/);
  assert.match(wf,/QA02 HTTP38:/);
  assert.match(wf,/qa02-backlog\.mjs/);
});
