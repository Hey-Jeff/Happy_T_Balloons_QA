import test from 'node:test';
import assert from 'node:assert/strict';
import { cases, coverage, validate } from './qa-core.mjs';

test('99 casos extraídos del QA02 sin duplicados ni pasos vacíos',()=>{
 assert.equal(cases.length,99);
 assert.deepEqual(validate(),[]);
});
test('histórico QA02 no equivale a pruebas automatizadas',()=>{
 const cov=coverage();
 assert.equal(cov.ready,0);
 assert.equal(cov.draft,90);
 assert.equal(cov.pending,1);
 assert.equal(cov.not_applicable,8);
});
test('no se preservan contraseñas del Excel en el JSON',()=>{
 const text=JSON.stringify(cases);
 for(const old of ['Admin@123456','ClaveIncorrecta#1','Erronea#1','ClienteQA@2026','NuevaClave@2026']) assert.ok(!text.includes(old));
});
