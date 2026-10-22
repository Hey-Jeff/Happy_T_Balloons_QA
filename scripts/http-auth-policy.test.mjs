import test from 'node:test';
import assert from 'node:assert/strict';
import {temporaryHttpAuthAllowed, temporaryHttpAuthCaseIds} from './http-auth-policy.mjs';
const config = {
  baseUrl:'http://13.184.33.122',allowHttp:'true',allowHttpAuth:'true',mode:'case',caseIds:['AUT-001']
};
test('solo cuatro escenarios sin cambios persistentes son habilitables',()=> {
  assert.deepEqual(temporaryHttpAuthCaseIds,['AUT-001','PRO-012','PED-005','INV-006']);
  for(const id of temporaryHttpAuthCaseIds)assert.equal(temporaryHttpAuthAllowed({...config,caseIds:[id]}),true);
});
test('sólo IP y ruta de staging explícita',()=>{
  for(const baseUrl of ['http://13.184.33.123','http://localhost','http://13.184.33.122:81','http://13.184.33.122/otro','http://user:pass@13.184.33.122','http://13.184.33.122/?x=1','https://13.184.33.122']) {
    assert.equal(temporaryHttpAuthAllowed({...config,baseUrl}),false,baseUrl);
  }
});
test('no habilitar sin permiso explícito de HTTP y autenticación',()=>{
  assert.equal(temporaryHttpAuthAllowed({...config,allowHttp:'false'}),false);
  assert.equal(temporaryHttpAuthAllowed({...config,allowHttpAuth:'false'}),false);
  assert.equal(temporaryHttpAuthAllowed({...config,allowHttpAuth:undefined}),false);
});
test('no permitir modos completos, múltiples IDs ni casos que escriben',()=>{
  for(const mode of ['all','module','public','borradores'])assert.equal(temporaryHttpAuthAllowed({...config,mode}),false);
  for(const caseIds of [['AUT-001','PRO-012'],[],['AUT-008'],['PRO-003'],['PAG-001'],['PED-004'],['AUT-002']]) {
    assert.equal(temporaryHttpAuthAllowed({...config,caseIds}),false,caseIds.join(','));
  }
});
