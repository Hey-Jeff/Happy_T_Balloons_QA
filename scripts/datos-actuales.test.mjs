import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cases, coverage } from './qa-core.mjs';
import { publicDraftIds } from './public-safe.mjs';
import { temporaryHttpAuthCaseIds } from './http-auth-policy.mjs';

const flow = readFileSync(new URL('../tests/flows/index.js', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/qa02-http-32.yml', import.meta.url), 'utf8');
function block(start, end) {
  const a = flow.indexOf(start), b = flow.indexOf(end, a+start.length);
  assert.ok(a >= 0 && b > a, `Falta el segmento ${start} / ${end}`);
  return flow.slice(a,b);
}
const idsBetween = (start,end) => {
  const a=workflow.indexOf(start), b=workflow.indexOf(end,a+start.length);
  assert.ok(a >= 0 && b > a, 'Bloque de workflow ausente');
  return [...workflow.slice(a+start.length,b).matchAll(/\b(?:AUT|CAT|PRO|CATE|INV|PED|CLI|PAG|ENV|REP)-\d{3}\b/g)].map(x=>x[0]);
};

test('PRO-004 comprueba estado de tabla con datos reales o vacio valido', () => {
  const section=block("'PRO-004':", "'CLI-006':");
  assert.match(section, /data-nombre/);
  assert.match(section, /No hay productos registrados/);
  assert.match(section, /response\?\.status\(\)/);
  assert.doesNotMatch(section, /Cremas Dove/);
});

test('REP-001 y REP-005 verifican encabezados reales y contemplan reporte vacio', () => {
  const v=block("'REP-001':", "'REP-005':");
  const inv=flow.slice(flow.indexOf("'REP-005':"));
  assert.match(v,/getByRole\('heading', \{ name: \/Reporte de Ventas\/i \}\)/);
  assert.match(inv,/getByRole\('heading', \{ name: \/Reporte de Inventario\/i \}\)/);
  assert.match(inv,/Sin productos en el filtro seleccionado/);
  assert.doesNotMatch(v,/getByText\(\/ventas\/i\)\.first\(\)/);
});

test('Lote 32 usa solo grupos aprobados sin alterar la matriz de cobertura', () => {
  const publicIds=idsBetween('public_ids=(', '\n          )');
  const authStart=workflow.indexOf('auth_ids=(');
  assert.ok(authStart>0);
  const authMatch=/auth_ids=\(([\s\S]*?)\n\s*\)/.exec(workflow.slice(authStart));
  assert.ok(authMatch);
  const authIds=[...authMatch[1].matchAll(/\b[A-Z]{3,4}-\d{3}\b/g)].map(x=>x[0]);
  assert.deepEqual(new Set(publicIds), new Set(publicDraftIds));
  assert.deepEqual(new Set(authIds), new Set(temporaryHttpAuthCaseIds));
  assert.equal(publicIds.length,14);
  assert.equal(authIds.length,18);
  assert.match(workflow,/QA_ALLOW_MUTATIONS: 'false'/);
  assert.match(workflow,/QA_ALLOW_HTTP_AUTH=true npm run test:case/);
  assert.match(workflow,/QA_ALLOW_HTTP_AUTH=false npm run test:case/);
  assert.equal(cases.length,105);
  assert.equal(coverage().not_applicable,8);
});
