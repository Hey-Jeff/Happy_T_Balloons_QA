import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cases, coverage } from './qa-core.mjs';
import { publicDraftIds } from './public-safe.mjs';
import { temporaryHttpAuthCaseIds } from './http-auth-policy.mjs';

const flow = readFileSync(new URL('../tests/flows/index.js', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/qa02-http-32.yml', import.meta.url), 'utf8');
const workflow38 = readFileSync(new URL('../.github/workflows/qa02-http-38.yml', import.meta.url), 'utf8');
const nuevos38 = ['PRO-002','CATE-003','ENV-012','ENV-001','ENV-003','ENV-006'];
const nuevos5 = ['ENV-002','CLI-004','CLI-005'];

function block(start, end) {
  const a = flow.indexOf(start), b = flow.indexOf(end, a+start.length);
  assert.ok(a >= 0 && b > a, `Falta el segmento ${start} / ${end}`);
  return flow.slice(a,b);
}
function idsBetween(contents, start, end) {
  const a = contents.indexOf(start), b = contents.indexOf(end,a+start.length);
  assert.ok(a >= 0 && b > a, 'Bloque de workflow ausente');
  return [...contents.slice(a+start.length,b).matchAll(/\b(?:AUT|CAT|PRO|CATE|INV|PED|CLI|PAG|ENV|REP)-\d{3}\b/g)].map(x=>x[0]);
}
function authIds(contents) {
  const authMatch=/auth_ids=\(([\s\S]*?)\n\s*\)/.exec(contents);
  assert.ok(authMatch, 'Bloque autenticado ausente');
  return [...authMatch[1].matchAll(/\b[A-Z]{3,4}-\d{3}\b/g)].map(x=>x[0]);
}

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

test('Lote historico 32 se conserva y es subconjunto del lote 38', () => {
  const publicIds=idsBetween(workflow, 'public_ids=(', '\n          )');
  const auth32=authIds(workflow);
  const public38=idsBetween(workflow38, 'public_ids=(', '\n          )');
  const auth38=authIds(workflow38);
  // Los lotes 32/38 conservan su lista histórica: deben seguir dentro de las políticas vigentes.
  for (const id of [...publicIds, ...public38]) assert.ok(publicDraftIds.has(id), id);
  for (const id of [...auth32, ...auth38]) assert.ok(temporaryHttpAuthCaseIds.includes(id), id);
  for (const id of nuevos38) assert.ok(auth38.includes(id) && !auth32.includes(id), id);
  for (const id of nuevos5) assert.ok(!auth38.includes(id), id);
  assert.equal(new Set(auth38).size,24);
  assert.equal(new Set([...public38, ...auth38]).size,38);
  assert.equal(publicIds.length,14);
  assert.equal(auth32.length,18);
  assert.equal(auth38.length,24);
  for (const wf of [workflow, workflow38]) {
    assert.match(wf,/QA_ALLOW_MUTATIONS: 'false'/);
    assert.match(wf,/QA_ALLOW_HTTP_AUTH=true npm run test:case/);
    assert.match(wf,/QA_ALLOW_HTTP_AUTH=false npm run test:case/);
  }
  assert.equal(cases.length,58);
  assert.equal(coverage().not_applicable,0);
});
