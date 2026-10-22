import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const flow = readFileSync(new URL('../tests/flows/index.js', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/qa02-manual.yml', import.meta.url), 'utf8');
const spec = readFileSync(new URL('../tests/qa02.spec.js', import.meta.url), 'utf8');

test('AUT-001 confirma Admin 200 y encabezado con icono incluido', () => {
  const start = flow.indexOf("'AUT-001':");
  const end = flow.indexOf("'AUT-002':", start);
  assert.ok(start >= 0 && end > start);
  const block = flow.slice(start, end);
  assert.match(block, /page\.goto\('\/Admin'\)/);
  assert.match(block, /dashboard\?\.status\(\)/);
  assert.match(block, /getByRole\('heading', \{ name: \/Dashboard\/i \}\)/);
  assert.doesNotMatch(block, /name: 'Dashboard', exact: true/);
});

test('No se suben artefactos privados cuando http_auth=true', () => {
  assert.match(workflow, /name: Guardar reportes y evidencias\s*\r?\n\s*if: \$\{\{ always\(\) && steps\.checkout\.outcome == 'success' && !inputs\.http_auth \}\}/);
});

test('La suite conserva las importaciones de las olas 2, 3 y 4', () => {
  for (const name of ['wave2Flows', 'wave3Flows', 'wave4Flows', 'catalogFixFlows']) {
    assert.match(spec, new RegExp('\\.\\.\\.' + name));
  }
});
