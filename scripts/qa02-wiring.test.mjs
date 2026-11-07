import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const spec = fs.readFileSync(path.join(root, 'tests/qa02.spec.js'), 'utf8');
const registry = fs.readFileSync(path.join(root, 'tests/flows/registry.js'), 'utf8');
const flow = fs.readFileSync(path.join(root, 'tests/flows/index.js'), 'utf8');

test('QA02: conserva todas las olas, catalogo y nuevas extensiones HTTP en orden', () => {
  const files = [
    ['flows', 'index.js'],
    ['sprintFlows', 'sprint-72h.js'],
    ['wave2Flows', 'wave2-72h.js'],
    ['wave3Flows', 'wave3-72h.js'],
    ['wave4Flows', 'wave4-72h.js'],
    ['catalogFixFlows', 'catalog-fixes.js'],
    ['safeHttpFlows', 'qa02-safe-extensions.js'],
    ['qa02ReadOnlyWave5', 'qa02-readonly-wave5.js'],
    ['qa02DatosUi', 'qa02-datos-ui.js'],
  ];
  let last = -1;
  for (const [name, file] of files) {
    assert.ok(registry.includes(`import { ${name} } from './${file}';`), `Falta importar ${name}`);
    const at = registry.indexOf(`['${file}', ${name}]`);
    assert.ok(at > last, `Orden de precedencia alterado en ${file}`);
    last = at;
  }
  assert.match(spec, /import \{ allFlows, flowSource \} from '\.\/flows\/registry\.js';/);
});

test('QA02: AUT-001 comprueba el panel real y no enlaces ocultos', () => {
  const start = flow.indexOf("'AUT-001':");
  const end = flow.indexOf("'CAT-001':", start);
  assert.ok(start >= 0 && end > start, 'Flujo AUT-001 ausente');
  const section = flow.slice(start, end);
  assert.match(section, /page\.goto\('\/Admin'\)/);
  assert.match(section, /getByRole\('heading',\s*\{\s*name:\s*\/Dashboard\|Estad/);
  assert.doesNotMatch(section, /href\*=.*Producto/);
});
