import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';
import {cases, implemented, statuses, validate} from './qa-core.mjs';
import {publicDraftIds} from './public-safe.mjs';
const src=fs.readFileSync(new URL('../tests/flows/wave4-72h.js', import.meta.url),'utf8');
const ids=[...src.matchAll(/'([A-Z]{3,4}-\d{3})':async/g)].map(m=>m[1]);
// Casos que qa02-datos-ui.js redefine con datos existentes de la UI.
const datosUi=fs.readFileSync(new URL('../tests/flows/qa02-datos-ui.js', import.meta.url),'utf8');
const overridden=id=>datosUi.includes(`'${id}': async`);
test('Ola 4: 10 flujos registrados en matriz y manifiesto',()=>{
 assert.equal(ids.length,10);
 assert.equal(new Set(ids).size,10);
 for(const id of ids){
   assert.ok(implemented.has(id),`No registrado: ${id}`);
   assert.equal(cases.find(x=>x.id===id)?.automation_status,statuses.draft);
 }
 assert.deepEqual(validate(),[]);
});
test('Ola 4: guardas de datos persistentes no operan sobre HTTP compartido',()=>{
 assert.match(src,/QA_ISOLATED_QA==='true'/);
 assert.match(src,/QA_ALLOW_MUTATIONS==='true'/);
 assert.match(src,/QA_RESETTABLE_DB==='YES'/);
 assert.match(src,/QA_ISOLATED_BASE_URL===origin/);
 assert.match(src,/!origin\.includes\('13\.184\.33\.122'\)/);
 assert.match(src,/QA_SINPE_SANDBOX/);
 assert.match(src,/QA_NO_REAL_TRANSACTIONS/);
});
test('Ola 4: solo los casos redefinidos con datos de la UI son publicos',()=>{
 for(const id of ['PRO-006','AUT-005','CLI-002'])assert.ok(publicDraftIds.has(id)&&overridden(id),id);
 for(const id of ids.filter(x=>!overridden(x)))assert.ok(!publicDraftIds.has(id),id);
 assert.equal(publicDraftIds.size,17);
});
