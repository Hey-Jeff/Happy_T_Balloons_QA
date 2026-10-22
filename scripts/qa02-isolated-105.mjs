#!/usr/bin/env node
// Ejecutor de la matriz QA02 completa, EXCLUSIVAMENTE para instancia HTTPS aislada y restaurable.
// No se ejecuta contra la instancia HTTP compartida. No convierte SKIP en PASS.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cases, statuses, root } from './qa-core.mjs';
import { classifyPlaywrightJSON } from './qa02-all-105.mjs';

export const ISOLATED_CONFIRMATION = 'ISOLATED_QA_RESETTABLE_CONFIRMED';

export function verifyIsolatedEnvironment(env) {
  const errors = [];
  const required = {
    QA_ISOLATED_QA: 'true',
    QA_ALLOW_MUTATIONS: 'true',
    QA_RESETTABLE_DB: 'YES',
    QA_NO_REAL_TRANSACTIONS: 'true',
    QA_ISOLATED_CONFIRMATION: ISOLATED_CONFIRMATION,
  };
  for (const [key,value] of Object.entries(required)) {
    if (env[key] !== value) errors.push(`${key} debe ser ${value}.`);
  }
  if (!env.QA_BASE_URL || !env.QA_ISOLATED_BASE_URL || env.QA_BASE_URL !== env.QA_ISOLATED_BASE_URL) {
    errors.push('QA_BASE_URL y QA_ISOLATED_BASE_URL deben ser la misma URL HTTPS de QA aislada.');
  }
  let url;
  try { url = new URL(env.QA_BASE_URL || ''); } catch { errors.push('QA_BASE_URL debe ser URL HTTPS válida.'); }
  if (url) {
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:') errors.push('Los tests que escriben requieren HTTPS; HTTP no es válido.');
    if (url.origin === 'http://13.184.33.122' || host === '13.184.33.122') errors.push('Prohibida la IP de QA compartida.');
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') errors.push('La URL aislada debe ser la raíz, sin usuario, clave, ruta ni parámetros.');
    if (['localhost','127.0.0.1','[::1]'].includes(host) || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) errors.push('Usar un hostname real de staging QA, no localhost ni una dirección IP.');
    if (!/(?:^|[.\-_])(qa|test|testing|staging|sandbox|preprod)(?:[.\-_]|$)/i.test(host)) errors.push('El hostname debe identificar expresamente QA/staging/test/sandbox/preprod.');
  }
  if (env.QA_ALLOW_HTTP === 'true') errors.push('QA_ALLOW_HTTP debe permanecer desactivado en modo aislado.');
  for(const key of ['QA_ADMIN_EMAIL','QA_ADMIN_PASSWORD','QA_CLIENT_EMAIL','QA_CLIENT_PASSWORD']) {
    if(!env[key]) errors.push(`Falta ${key}: usar credenciales exclusivas de QA aislado.`);
  }
  return errors;
}

// Para fixtures que todavía requieren preparación coordinada. Dejar ausentes => BLOCKED.
// Los flujos auto-generadores de producto/categoría/zona NO necesitan nombres históricos.
export const REQUIRED_FIXTURES = Object.freeze({
  'AUT-002':['QA_INVALID_PASSWORD'],
  'AUT-003':['QA_LOCKOUT_EMAIL','QA_LOCKOUT_ATTEMPTS','QA_INVALID_PASSWORD'],
  'AUT-004':['QA_RECOVERY_EMAIL'],
  'AUT-005':['QA_UNREGISTERED_EMAIL'],
  'AUT-006':['QA_VALID_RESET_TOKEN','QA_RESET_NEW_PASSWORD'],
  'AUT-007':['QA_EXPIRED_RESET_TOKEN'],
  'AUT-008':['QA_TEST_ROLE_NAME'],
  'AUT-009':['QA_ROLE_USER_EMAIL','QA_TEST_ROLE_NAME'],
  'AUT-010':['QA_DELETE_ROLE_NAME'],
  'AUT-011':['QA_2FA_EMAIL','QA_2FA_PASSWORD','QA_2FA_VALID_CODE'],
  'AUT-012':['QA_2FA_EMAIL','QA_2FA_PASSWORD','QA_2FA_INVALID_CODE'],
  'AUT-013':['QA_2FA_EMAIL','QA_2FA_PASSWORD','QA_2FA_EXPIRED_CODE'],
  'CAT-003':['QA_EXPECT_EMPTY_CATALOG'],
  'CATE-005':['QA_EXPECT_EMPTY_CATEGORIES'],
  'CLI-005':['QA_EMPTY_CLIENT_EMAIL','QA_EMPTY_CLIENT_PASSWORD'],
  'CLI-007':['QA_FOREIGN_ORDER_ID'],
  'INV-003':['QA_INVENTORY_PRODUCT_NAME'],
  'INV-004':['QA_INVENTORY_PRODUCT_NAME'],
  'INV-008':['QA_INVENTORY_PRODUCT_NAME'],
  'INV-005':['QA_LOW_STOCK_PRODUCT_ID','QA_LOW_STOCK_TARGET'],
  'INV-009':['QA_ORDER_PRODUCT_ID'],
  'PED-008':['QA_EXPECT_EMPTY_ADMIN_ORDERS'],
  'PED-010':['QA_ORDER_CHANGE_ID'],
  'PED-011':['QA_ORDER_INVALID_CHANGE_ID'],
  'PED-012':['QA_CANCEL_ORDER_ID','QA_CANCEL_PRODUCT_ID','QA_CANCEL_STOCK_RESTOCK_QTY'],
  'PAG-001':['QA_SINPE_TEST_RECEIPT','QA_SINPE_TEST_AMOUNT','QA_SINPE_SANDBOX_TOKEN','QA_SINPE_TEST_PHONE'],
  'PAG-002':['QA_SINPE_SANDBOX_TOKEN','QA_SINPE_TEST_PHONE'],
  'PAG-003':['QA_SINPE_PAID_RECEIPT','QA_SINPE_TEST_AMOUNT','QA_SINPE_SANDBOX_TOKEN','QA_SINPE_TEST_PHONE'],
  'PAG-004':['QA_SINPE_TEST_RECEIPT','QA_SINPE_TEST_AMOUNT','QA_PAID_ORDER_ID','QA_SINPE_SANDBOX_TOKEN','QA_SINPE_TEST_PHONE'],
  'CATE-012':['QA_CATEGORY_WITH_PRODUCTS'],
  'ENV-005':['QA_DELIVERY_ORDER_ID'],
  'ENV-007':['QA_DELIVERY_ORDER_ID','QA_FULL_DELIVERY_DATE'],
  'ENV-008':['QA_DELIVERY_ORDER_ID','QA_RESCHEDULE_DATE'],
});
export const PAYMENT_IDS = new Set(['PAG-001','PAG-002','PAG-003','PAG-004']);
export function makeIsolatedPlan(allCases=cases, env=process.env) {
  return allCases.map(tc=>{
    let status,reason;
    if(tc.automation_status===statuses.na){status='N/A';reason='Función fuera del alcance actual';}
    else if(tc.automation_status===statuses.pending){status='PENDING';reason='Todavía no existe implementación Playwright';}
    else if (PAYMENT_IDS.has(tc.id) && env.QA_SINPE_SANDBOX!=='true') {
      status='BLOCKED';reason='Falta sandbox de SINPE (QA_SINPE_SANDBOX=true)';
    } else {
      const missing=(REQUIRED_FIXTURES[tc.id]||[]).filter(k=>!env[k] || (k.startsWith('QA_EXPECT_EMPTY_') && env[k]!=='true'));
      if (missing.length){status='BLOCKED';reason='Faltan fixtures de QA: '+missing.join(', ');}
      else {status='QUEUED';reason='Escenario preparado para ejecutarse sobre QA aislada';}
    }
    return {id:tc.id,module:tc.module,title:tc.title,status,reason};
  });
}
export function countIsolated(plan) {return plan.reduce((a,c)=>(a[c.status]=(a[c.status]||0)+1,a),{});}
export function isSuccessfulPlaywrightRun(json,exitCode){return classifyPlaywrightJSON(json,exitCode);}
function textCell(v){return String(v||'').replace(/[|\r\n]/g,' ').slice(0,190);}
function findSkipReason(json) {
  const search=suites=>{for(const suite of suites||[]){for(const spec of suite.specs||[]){for(const t of spec.tests||[]){const reason=(t.annotations||[]).find(x=>x.type==='skip')?.description;if(reason)return reason;}}const nested=search(suite.suites);if(nested)return nested;}return '';};
  return search(json?.suites);
}
function summary(plan){
  const n=countIsolated(plan);
  const out=['## QA02 · Matriz completa · QA aislado','',
    `**PASS ${n.PASS||0} · FAIL ${n.FAIL||0} · BLOCKED ${n.BLOCKED||0} · N/A ${n['N/A']||0} · PENDING ${n.PENDING||0}**`,'',
    'PASS significa resultado exploratorio ejecutado. Ausencia de fixture, SKIP y función no existente jamás se consideran PASS.',
    'Ejecución autorizada por confirmación expresa de BD aislada y restaurable. NO implica que la restauración se haya realizado.','',
    '| Caso | Módulo | Estado | Motivo |','|---|---|---|---|'];
  for(const e of plan)out.push(`| ${e.id} | ${e.module} | ${e.status} | ${textCell(e.reason)} |`);
  out.push('',`**Total: ${plan.length}/105**`);
  return out.join('\n')+'\n';
}
export async function main(args=process.argv.slice(2),env=process.env) {
  const errs=verifyIsolatedEnvironment(env);
  if(errs.length)throw new Error('SEGURIDAD: '+errs.join(' '));
  const plan=makeIsolatedPlan(cases,env);
  const counts=countIsolated(plan);
  if(plan.length!==105 || (counts.PENDING||0)!==1 || (counts['N/A']||0)!==8) throw new Error('Matriz no coincide con los 105 casos base');
  if(args.includes('--plan')) {
    console.log('QA02 aislado: '+JSON.stringify(counts));
    console.log('Solo correrá lo que tenga fixtures. Nunca rellenar secretos ficticios ni probar contra la BD compartida.');
    return 0;
  }
  const output=path.join(root,'qa/results/playwright.json');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  for(const entry of plan){
    if(entry.status!=='QUEUED')continue;
    fs.rmSync(output,{force:true});
    const child=spawnSync(process.execPath,['scripts/qa.mjs','run','case',entry.id,'--try-drafts'],{
      cwd:root,encoding:'utf8',maxBuffer:15*1024*1024,timeout:70_000,
      env:{...env,QA_ALLOW_HTTP:'false',QA_ALLOW_HTTP_AUTH:'false',QA_ISOLATED_QA:'true',QA_ALLOW_MUTATIONS:'true'}
    });
    let json;
    try{json=JSON.parse(fs.readFileSync(output,'utf8'));}catch{json=null;}
    const res=isSuccessfulPlaywrightRun(json,child.status===null?1:child.status);
    entry.status=res.status;entry.reason=res.reason;
    if(res.status==='BLOCKED')entry.reason=textCell(findSkipReason(json)||res.reason);
    if(child.error){entry.status='FAIL';entry.reason='Fallo de ejecución o tiempo máximo excedido';}
    console.log(`${entry.id}: ${entry.status} — ${entry.reason}`);
    // Nunca imprimir stdout, stderr ni artefactos del navegador de sesiones autenticadas.
  }
  const finalCount=countIsolated(plan);
  console.log('QA02 AISLADO 105: '+JSON.stringify(finalCount));
  if(env.GITHUB_STEP_SUMMARY)fs.appendFileSync(env.GITHUB_STEP_SUMMARY,summary(plan),'utf8');
  else console.log(summary(plan));
  return (finalCount.FAIL||0)>0 || (finalCount.BLOCKED||0)>0 || (finalCount.PENDING||0)>0 ? 1 : 0;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{process.exitCode=await main();}catch(err){console.error('QA02 AISLADO: '+err.message);process.exitCode=2;}
}
