import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const workflow=readFileSync(new URL('../.github/workflows/qa02-todos-105.yml',import.meta.url),'utf8');
test('Un solo workflow 105 ofrece compartido por defecto y aislado explícito',()=>{
  assert.match(workflow,/name: QA02 TODOS - 105 casos en una ejecución/);
  assert.match(workflow,/default: shared-http/);
  assert.match(workflow,/\s+- isolated-qa/);
  assert.match(workflow,/QA_ISOLATED_CONFIRMATION: \$\{\{ inputs\.confirm_isolated \}\}/);
  assert.match(workflow,/node scripts\/qa02-isolated-105\.mjs --plan/);
  assert.match(workflow,/node scripts\/qa02-isolated-105\.mjs\s*\n/);
  assert.match(workflow,/node scripts\/qa02-all-105\.mjs/);
});
test('Conserva secretos distintos en aislado; no exporta capturas o sesiones',()=>{
  assert.match(workflow,/secrets\.QA_ISO_ADMIN_EMAIL/);
  assert.match(workflow,/secrets\.QA_ISO_CLIENT_PASSWORD/);
  assert.match(workflow,/secrets\.QA_RESETTABLE_DB_CONFIRMATION/);
  assert.match(workflow,/secrets\.QA_NO_REAL_TRANSACTIONS/);
  assert.doesNotMatch(workflow,/upload-artifact|actions\/upload-artifact/);
  assert.match(workflow,/permissions:\s+contents: read/);
});
