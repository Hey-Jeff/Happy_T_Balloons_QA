#!/usr/bin/env node
// Una sola ejecución auditable de TODOS los 58 casos QA02.
// Nunca traduce exit-code=0 a PASS sin leer resultado real Playwright JSON.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cases, statuses, root } from './qa-core.mjs';
import { publicDraftIds } from './public-safe.mjs';
import { temporaryHttpAuthCaseIds, temporaryHttpAuthAllowed } from './http-auth-policy.mjs';

// Lista auditada de flujos anonimos + autenticados sin cambios persistentes.
// NO heredar permisos de escritura de flags externos ni del Excel.
export const AUTH_SAFE = Object.freeze([
  'AUT-001','PRO-012','PED-005','INV-006','PRO-004','PRO-005',
  'CATE-004','INV-001','PED-007','PED-009',
  'REP-001','REP-002','REP-003','REP-004','REP-005','REP-006','REP-007','REP-008',
  'PRO-002','CATE-003','ENV-012','ENV-001','ENV-003','ENV-006',
  'ENV-002','CLI-004','CLI-005',
  'CATE-002','CATE-009','PRO-003','PRO-008','PRO-009','INV-004',
  'INV-007','INV-008','PED-006','PED-008','PED-011','CLI-007'
]);
export const PUBLIC_SAFE = Object.freeze([
  'CAT-001','CAT-002','CAT-003','CAT-004','CAT-005','CAT-006','CAT-008',
  'CAT-011','CAT-012','CLI-002','CLI-003','CLI-006','PRO-006',
  'PED-001','PED-002','PED-003','AUT-005'
]);
// Casos que se mantienen BLOCKED a propósito; el motivo se publica en el resumen de Actions.
export const BLOCKED_REASONS = Object.freeze({
  'AUT-002': 'Bloqueado: la cuenta QA_tester (jeffrysmorales@gmail.com) quedó bloqueada temporalmente por intentos fallidos el 23/10/2026; el caso consume intentos de esa cuenta y no se ejecuta.',
  'CATE-012': 'Bloqueado: defecto conocido (se inactiva una categoría con productos sin advertencia); el caso modifica datos compartidos.',
});

export function makePlan() {
  const approvedPublic = new Set(publicDraftIds);
  const approvedAuth = new Set(temporaryHttpAuthCaseIds);
  if (approvedPublic.size !== 17 || approvedAuth.size !== 39 ||
      PUBLIC_SAFE.some(id => !approvedPublic.has(id)) ||
      AUTH_SAFE.some(id => !approvedAuth.has(id))) {
    throw new Error('Politica HTTP no coincide con los 56 IDs revisados: cancelar lote, no abrir permisos automaticamente.');
  }
  const safePublic = new Set(PUBLIC_SAFE);
  const safeAuth = new Set(AUTH_SAFE);
  const entries = cases.map(tc => {
    let status,reason;
    if(tc.automation_status === statuses.na){status='N/A';reason='Fuera de alcance en la matriz actual';}
    else if(tc.automation_status === statuses.pending){status='PENDING';reason='Sin implementación Playwright';}
    else if(safePublic.has(tc.id) || safeAuth.has(tc.id)){
      status='QUEUED';reason=safePublic.has(tc.id)?'Lectura pública / sesión temporal':'Lectura HTTP con cuenta QA';
    }else{status='BLOCKED';reason=BLOCKED_REASONS[tc.id]||'Requiere precondiciones, datos controlados o aislamiento para posibles escrituras';}
    return {id:tc.id,module:tc.module,title:tc.title,status,reason,kind:safePublic.has(tc.id)?'public':safeAuth.has(tc.id)?'auth':'none'};
  });
  const counts=count(entries);
  if(entries.length!==58 || counts.QUEUED!==56 || counts.BLOCKED!==2 || counts['N/A'] || counts.PENDING ||
     Object.keys(BLOCKED_REASONS).some(id=>entries.find(e=>e.id===id)?.status!=='BLOCKED')){
    throw new Error(`Matriz inesperada: ${JSON.stringify(counts)}. No inventar cobertura.`);
  }
  return entries;
}
// Solo un FAIL real marca la ejecución en rojo; BLOCKED, PENDING y N/A se informan en la tabla.
export function exitCodeFor(entries){return (count(entries).FAIL||0)>0 ? 1 : 0;}
export function count(entries){const n={};for(const x of entries)n[x.status]=(n[x.status]||0)+1;return n;}

function flattenTests(suites){
  const out=[];
  for(const s of suites||[]){
    for(const spec of s.specs||[]) for(const t of spec.tests||[])out.push(t);
    out.push(...flattenTests(s.suites||[]));
  }
  return out;
}
// QA02 CLI puede terminar 0 cuando Playwright hace skip; esto lo detecta.
export function classifyPlaywrightJSON(json, exitCode){
  if(!json || !Array.isArray(json.suites)) return {status:'FAIL',reason:'Falta JSON de resultados de Playwright'};
  const tests=flattenTests(json.suites);
  if(tests.length!==1)return {status:'FAIL',reason:`Se esperó exactamente 1 prueba, recibidas ${tests.length}`};
  const test=tests[0];
  const results=test.results||[];
  const statusesFound=results.map(x=>x.status);
  if(results.some(x=>x.status==='failed'||x.status==='timedOut'||x.status==='interrupted') || exitCode!==0){
    return {status:'FAIL',reason:'Aserción fallida o error de ejecución'};
  }
  if(statusesFound.includes('skipped') || results.length===0 || test.status==='skipped'){
    return {status:'BLOCKED',reason:'Playwright omitió el caso por falta de precondición o protección QA'};
  }
  if(statusesFound.length===1 && statusesFound[0]==='passed'){
    return {status:'PASS',reason:'Prueba Playwright aprobada (exploratoria)'};
  }
  return {status:'FAIL',reason:`Estado Playwright no reconocido: ${statusesFound.join(',')}`};
}
function safeCell(input){return String(input??'').replace(/[|\r\n]/g,' ').slice(0,180);}
function formatSummary(entries){
  const counts=count(entries);
  const lines=[
    '## QA02 | Una sola ejecución | 58 casos',
    '',
    `**PASS ${counts.PASS||0} · FAIL ${counts.FAIL||0} · BLOCKED ${counts.BLOCKED||0} · PENDING ${counts.PENDING||0} · N/A ${counts['N/A']||0}**`,
    '',
    'PASS es exploratorio; se conserva el estado formal hasta validación de criterios. Los BLOCKED y N/A nunca son PASS.',
    'Reporte HTML de Playwright: artifact "qa02-reporte-playwright" de este run (14 días), publicado solo si no contiene contraseñas. Los casos con sesión HTTP no generan capturas, videos ni trazas.',
    '',
    '| ID | Módulo | Resultado | Motivo resumido |',
    '|---|---|---|---|'
  ];
  for(const x of entries)lines.push(`| ${x.id} | ${x.module} | ${safeCell(x.status)} | ${safeCell(x.reason)} |`);
  lines.push('',`**Total contabilizado: ${entries.length} / 58.**`);
  return lines.join('\n')+'\n';
}
export async function main(argv=process.argv.slice(2)){
  const entries=makePlan();
  if(argv.includes('--plan')){
    console.log(`PLAN 58: ${JSON.stringify(count(entries))}`);
    console.log('56 seguros por HTTP; 2 bloqueados con motivo (AUT-002, CATE-012).');
    return 0;
  }
  if(process.env.QA_BASE_URL!=='http://13.184.33.122' || process.env.QA_ALLOW_HTTP!=='true'){
    throw new Error('Lote HTTP limitado a la instancia QA exacta http://13.184.33.122.');
  }
  if(process.env.QA_ALLOW_MUTATIONS==='true'||process.env.QA_ISOLATED_QA==='true'){
    throw new Error('Lote compartido de 58: desactivar mutaciones. Se prepara QA aislado en fase aparte.');
  }
  const resultFile=path.join(root,'qa/results/playwright.json');
  fs.mkdirSync(path.dirname(resultFile),{recursive:true});
  for(const entry of entries){
    if(entry.status!=='QUEUED')continue;
    const isAuth=entry.kind==='auth';
    const authEnv=isAuth?'true':'false';
    if(isAuth && !temporaryHttpAuthAllowed({baseUrl:process.env.QA_BASE_URL,allowHttp:'true',allowHttpAuth:authEnv,mode:'case',caseIds:[entry.id]})){
      entry.status='BLOCKED';entry.reason='Política HTTP no autoriza este caso';continue;
    }
    fs.rmSync(resultFile,{force:true});
    const child=spawnSync(process.execPath,['scripts/qa.mjs','run','case',entry.id,'--try-drafts'],{
      cwd:root,encoding:'utf8',maxBuffer:15*1024*1024,timeout:50_000,
      env:{...process.env,QA_ALLOW_HTTP:'true',QA_ALLOW_HTTP_AUTH:authEnv,QA_ALLOW_MUTATIONS:'false',QA_ISOLATED_QA:'false',QA_RESETTABLE_DB:'NO'}
    });
    let json=null;
    try{json=JSON.parse(fs.readFileSync(resultFile,'utf8'));}catch{}
    const outcome=classifyPlaywrightJSON(json, child.status===null?1:child.status);
    entry.status=outcome.status;
    entry.reason=outcome.reason;
    if(child.error){entry.status='FAIL';entry.reason=`Error al ejecutar: ${child.error.code||'desconocido'}`;}
    console.log(`${entry.id}: ${entry.status} — ${entry.reason}`);
    // No imprimir stdout/stderr de sesiones HTTP autenticadas (pueden contener datos).
  }
  const summary=formatSummary(entries);
  console.log(`QA02 58: ${JSON.stringify(count(entries))}`);
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary,'utf8');
  else console.log(summary);
  return exitCodeFor(entries);
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{process.exitCode=await main();}catch(err){console.error('ERROR QA02 TODOS 58: '+err.message);process.exitCode=2;}
}
