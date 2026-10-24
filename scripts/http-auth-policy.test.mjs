import test from 'node:test';
import assert from 'node:assert/strict';
import {temporaryHttpAuthAllowed, temporaryHttpAuthCaseIds} from './http-auth-policy.mjs';
const config = {
  baseUrl:'http://13.184.33.122', allowHttp:'true', allowHttpAuth:'true', mode:'case', caseIds:['AUT-001']
};
const approved = [
  'AUT-001',
  'PRO-012',
  'PED-005',
  'INV-006',
  'PRO-004',
  'PRO-005',
  'CATE-004',
  'INV-001',
  'PED-007',
  'PED-009',
  'REP-001',
  'REP-002',
  'REP-003',
  'REP-004',
  'REP-005',
  'REP-006',
  'REP-007',
  'REP-008',
  'PRO-002',
  'CATE-003',
  'ENV-012',
  'ENV-001',
  'ENV-003',
  'ENV-006',
  'ENV-002',
  'CLI-004',
  'CLI-005',
  'CATE-002',
  'CATE-009',
  'PRO-003',
  'PRO-008',
  'PRO-009',
  'INV-004',
  'INV-007',
  'INV-008',
  'PED-006',
  'PED-008',
  'PED-011',
  'CLI-007',
];

test('solo los treinta y nueve escenarios HTTP de lectura/rechazo estan habilitados', () => {
  assert.deepEqual(temporaryHttpAuthCaseIds, approved);
  assert.equal(new Set(approved).size, approved.length);
  for (const id of approved) assert.equal(temporaryHttpAuthAllowed({...config,caseIds:[id]}),true,id);
});
test('el permiso solo aplica a la IP y raiz exactas de QA',()=>{
  for(const baseUrl of ['http://13.184.33.123','http://localhost','http://13.184.33.122:81','http://13.184.33.122/otro','http://user:pass@13.184.33.122','http://13.184.33.122/?x=1','https://13.184.33.122']) {
    assert.equal(temporaryHttpAuthAllowed({...config,baseUrl}),false,baseUrl);
  }
});
test('no habilitar sin permisos explicitos de HTTP y autenticacion',()=>{
  for(const override of [{allowHttp:'false'},{allowHttpAuth:'false'},{allowHttpAuth:undefined}]) {
    assert.equal(temporaryHttpAuthAllowed({...config,...override}),false);
  }
});
test('no permitir lotes dentro del CLI, ni casos que escriben',()=>{
  for(const mode of ['all','module','public','borradores','lecturas'])
    assert.equal(temporaryHttpAuthAllowed({...config,mode}),false,mode);
  for(const caseIds of [['AUT-001','PRO-012'],[],['AUT-002'],['CATE-012'],['AUT-005'],['CAT-003']]) {
    assert.equal(temporaryHttpAuthAllowed({...config,caseIds}),false,caseIds.join(','));
  }
});
