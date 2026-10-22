import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const spec = fs.readFileSync(path.join(root, 'tests/qa02.spec.js'), 'utf8');
const flow = fs.readFileSync(path.join(root, 'tests/flows/index.js'), 'utf8');

test('QA02: no perder las cuatro olas ni los overrides de catalogo', () => {
  for (const [name, file] of [
    ['flows', 'index.js'],
    ['sprintFlows', 'sprint-72h.js'],
    ['wave2Flows', 'wave2-72h.js'],
    ['wave3Flows', 'wave3-72h.js'],
    ['wave4Flows', 'wave4-72h.js'],
    ['catalogFixFlows', 'catalog-fixes.js'],
  ]) {
    assert.ok(spec.includes(`import { ${name} } from './flows/${file}';`), `Falta importar ${name}`);
  }
  assert.match(spec, /const allFlows\s*=\s*\{\s*\.\.\.flows,\s*\.\.\.sprintFlows,\s*\.\.\.wave2Flows,\s*\.\.\.wave3Flows,\s*\.\.\.wave4Flows,\s*\.\.\.catalogFixFlows\s*\}/);
});

test('QA02: AUT-001 comprueba dashboard real y no enlaces ocultos', () => {
  const start = flow.indexOf("'AUT-001':");
  const end = flow.indexOf("'AUT-002':", start);
  assert.ok(start >= 0 && end > start, 'Flujo AUT-001 ausente');
  const section = flow.slice(start, end);
  assert.match(section, /page\.goto\('\/Admin'\)/);
  assert.match(section, /getByRole\('heading',\s*\{\s*name:\s*'Dashboard'/);
  assert.doesNotMatch(section, /href\*=.*Producto/);
});
