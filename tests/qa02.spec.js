import { test } from '@playwright/test';
import { cases, statuses } from '../scripts/qa-core.mjs';
import { flows } from './flows/index.js';
import { sprintFlows } from './flows/sprint-72h.js';
const allFlows={...flows,...sprintFlows};

const idFilter=new Set((process.env.QA_FILTER_IDS||'').split(',').filter(Boolean));
for (const tc of cases){
 if(idFilter.size && !idFilter.has(tc.id)) continue;
 const title=`[${tc.id}] [${tc.module}] ${tc.title}`;
 const isDraft=tc.automation_status===statuses.draft;
 const isReady=tc.automation_status===statuses.ready;
 const active=(isReady||(isDraft&&process.env.QA_RUN_DRAFTS==='1'))&&Boolean(allFlows[tc.id]);
 test(title,async({page},testInfo)=>{
   testInfo.annotations.push({type:'Source',description:`QA02 Sheet1 fila ${tc.source.row}`});
   testInfo.annotations.push({type:'Prioridad',description:tc.priority});
   testInfo.annotations.push({type:'Resultado histórico',description:tc.baseline_result_2026_10_05});
   if(!active){
     test.skip(true,`NO automatizada: ${tc.automation_status}. No equivale a PASS.`);
     return;
   }
   // No repetir intentos de autenticación inválida. Evitar bloqueo de cuentas QA.
   if(tc.id==='AUT-002' && testInfo.retry>0) test.skip(true,'No reintentar login inválido automáticamente.');
   await allFlows[tc.id]({page,tc,testInfo});
 });
}
