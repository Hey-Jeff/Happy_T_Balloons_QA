import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const flow = readFileSync(new URL('../tests/flows/index.js', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/qa02-manual.yml', import.meta.url), 'utf8');
const registry = readFileSync(new URL('../tests/flows/registry.js', import.meta.url), 'utf8');

test('AUT-001 confirma Admin 200, panel de administración y menús del rol', () => {
  const start = flow.indexOf("'AUT-001':");
  const end = flow.indexOf("'CAT-001':", start);
  assert.ok(start >= 0 && end > start);
  const block = flow.slice(start, end);
  assert.match(block, /page\.goto\('\/Admin'\)/);
  assert.match(block, /dashboard\?\.status\(\)/);
  assert.match(block, /getByRole\('heading', \{ name: \/Dashboard\|Estad\[ií\]sticas\/i \}\)/);
  assert.match(block, /Panel de administración/);
  assert.match(block, /Operaciones[\s\S]*Inventario[\s\S]*Configuraci/);
  assert.doesNotMatch(block, /name: 'Dashboard', exact: true/);
});

test('index.js ya no contiene el AUT-002 que probaba contraseñas incorrectas contra la cuenta admin', () => {
  assert.doesNotMatch(flow, /'AUT-002'\s*:/);
  assert.doesNotMatch(flow, /QA_INVALID_PASSWORD/);
});

test('No se suben artefactos privados cuando http_auth=true', () => {
  assert.match(workflow, /name: Guardar reportes y evidencias\s*\r?\n\s*if: \$\{\{ always\(\) && steps\.checkout\.outcome == 'success' && !inputs\.http_auth \}\}/);
});

test('El registro conserva las importaciones de las olas 2, 3 y 4', () => {
  for (const name of ['wave2Flows', 'wave3Flows', 'wave4Flows', 'catalogFixFlows']) {
    assert.match(registry, new RegExp(`\\['[\\w.-]+\\.js', ${name}\\]`));
  }
});
