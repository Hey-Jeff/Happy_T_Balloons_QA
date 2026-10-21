#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const envFile = path.resolve(import.meta.dirname, '../.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
import { spawnSync } from 'node:child_process';
import { cases, coverage, root, validate, statuses } from './qa-core.mjs';
import { publicDraftIds } from './public-safe.mjs';

const [action = 'help', mode, ...rest] = process.argv.slice(2);
const args=rest.filter(s=>s.startsWith('--'));
const positional=rest.filter(s=>!s.startsWith('--'));
const flags=new Set(args);
const pad = (s,n)=>String(s).padEnd(n);
function fail(message,code=2){console.error(`ERROR: ${message}`);process.exit(code)}
function help(){
 console.log(`QA02 - Happy Times Balloons (Playwright sin Claude Code)
  npm run qa:validate
  npm run qa:coverage
  npm run qa:list -- [AUT|CAT|PRO|CATE|INV|PED|CLI|PAG|ENV|REP]
  npm run test:public    # 13 borradores anónimos, incluidos carrito de sesión, sin credenciales
  npm run test:case -- AUT-001 --try-drafts
  npm run test:module -- CAT --try-drafts --allow-pending
  npm run test:all -- --try-drafts --allow-pending
  npm run report
Nota: --try-drafts NO significa verificación; implica contrastar los localizadores con la aplicación.
      Sin --allow-pending, la ejecución devuelve código de error si faltan casos.`);
}
if(action==='help'){help(); process.exit(0)}
if(action==='validate'){
 const errors=validate(); if(errors.length) fail(errors.join('\n'));
 console.log(`OK: ${cases.length} casos, IDs únicos, campos y cobertura verificables.`);process.exit(0);
}
if(action==='list'){
 const prefix=mode?.toUpperCase();
 const selected=prefix ? cases.filter(t=>t.module===prefix || t.id===prefix) : cases;
 if(!selected.length)fail('No hay casos para el filtro.');
 for(const tc of selected) console.log(`${pad(tc.id,10)} ${pad(tc.automation_status,32)} ${tc.title}`);
 process.exit(0);
}
if(action==='coverage'){
 const cov=coverage(); console.log('Cobertura real (no confundir con el histórico QA02):');
 for(const [k,v] of Object.entries(cov)) console.log(`${pad(k,17)} ${v}`);
 const byModule=[...new Set(cases.map(c=>c.module))];
 for(const m of byModule){const c=coverage(cases.filter(t=>t.module===m)); console.log(`${pad(m,6)} | ready ${c.ready} | drafts ${c.draft} | pendiente ${c.pending} | N/A ${c.not_applicable}`)}
 process.exit(0);
}
if(action!=='run')fail('Comando desconocido. Usa: node scripts/qa.mjs help');
if(!['case','all','module','public'].includes(mode))fail('Usar run case|all|module|public');
const selector=positional[0]?.toUpperCase();
const selected=mode==='all' ? cases : mode==='public' ? cases.filter(c=>publicDraftIds.has(c.id)) : mode==='case' ? cases.filter(c=>c.id===selector) : cases.filter(c=>c.module===selector);
if(!selected.length)fail(`No se encontró ${mode==='case'?'ID':'módulo'}: ${selector||'(vacío)'}`);
const tryDrafts=mode==='public' || flags.has('--try-drafts');
const allowed=selected.filter(c=>c.automation_status===statuses.ready || (tryDrafts && c.automation_status===statuses.draft));
const missing=selected.filter(c=>!allowed.includes(c));
console.log(`Seleccionados ${selected.length}, ejecutables ${allowed.length}, pendientes/N-A ${missing.length}`);
if(missing.length) console.log('Sin ejecución:', missing.map(t=>t.id).join(', '));
if(!allowed.length)fail('No hay pruebas listas. Las 10 implementaciones son BORRADORES; usa --try-drafts para probarlas en una instancia QA.');
if(!process.env.QA_BASE_URL)fail('Configura QA_BASE_URL en .env (ver .env.example).');
let parsed;
try { parsed = new URL(process.env.QA_BASE_URL); } catch { fail('QA_BASE_URL debe ser URL válida.'); }
if(!['http:','https:'].includes(parsed.protocol)) fail('QA_BASE_URL debe usar HTTP(S).');
if(parsed.protocol==='http:'){
  if(process.env.QA_ALLOW_HTTP!=='true') fail('HTTP deshabilitado: configura una URL HTTPS o habilita QA_ALLOW_HTTP para pruebas públicas sin credenciales.');
  const insecure=allowed.filter(c=>!publicDraftIds.has(c.id));
  if(insecure.length) fail(`SEGURIDAD: en HTTP solo se permiten los casos públicos ${[...publicDraftIds].join(', ')}. Bloqueados: ${insecure.map(c=>c.id).join(', ')}. Activa HTTPS para casos autenticados.`,3);
  console.warn('ADVERTENCIA: destino HTTP sin cifrado. No se enviarán credenciales.');
}

const env={...process.env, QA_RUN_DRAFTS:tryDrafts?'1':'0', QA_FILTER_IDS:allowed.map(t=>t.id).join(',')};
const child=spawnSync('npx',['playwright','test',... (flags.has('--headed')?['--headed']:[])],{cwd:root,env,stdio:'inherit',shell:process.platform==='win32'});
if(child.error)fail(`No se pudo ejecutar Playwright: ${child.error.message}. Usa npm install.`);
if(child.status!==0)process.exit(child.status || 1);
if(missing.length && !flags.has('--allow-pending'))fail(`Ejecución parcial: ${missing.length} casos sin automatizar, no se considera suite completa.`);
console.log('Completado. Consultar reporte con npm run report.');
