import { test } from '@playwright/test';
import { cases, statuses } from '../scripts/qa-core.mjs';
import { flows } from './flows/index.js';
import { sprintFlows } from './flows/sprint-72h.js';
import { catalogFixFlows } from './flows/catalog-fixes.js';
import { wave2Flows } from './flows/wave2-72h.js';
import { wave3Flows } from './flows/wave3-72h.js';
import { wave4Flows } from './flows/wave4-72h.js';
import { safeHttpFlows } from './flows/qa02-safe-extensions.js';
import { qa02ReadOnlyWave5 } from './flows/qa02-readonly-wave5.js';
import { qa02DatosUi } from './flows/qa02-datos-ui.js';

// No se sustituyen validaciones verdaderas con nombres historicos del Excel.
const allFlows = { ...flows, ...sprintFlows, ...wave2Flows, ...wave3Flows, ...wave4Flows, ...catalogFixFlows, ...safeHttpFlows, ...qa02ReadOnlyWave5, ...qa02DatosUi };

const idFilter = new Set((process.env.QA_FILTER_IDS || '').split(',').filter(Boolean));
for (const tc of cases) {
  if (idFilter.size && !idFilter.has(tc.id)) continue;
  const title = `[${tc.id}] [${tc.module}] ${tc.title}`;
  const isDraft = tc.automation_status === statuses.draft;
  const isReady = tc.automation_status === statuses.ready;
  const active = (isReady || (isDraft && process.env.QA_RUN_DRAFTS === '1')) && Boolean(allFlows[tc.id]);
  test(title, async ({page}, testInfo) => {
    testInfo.annotations.push({type: 'Source', description: `QA02 Sheet1 fila ${tc.source.row}`});
    testInfo.annotations.push({type: 'Prioridad', description: tc.priority});
    testInfo.annotations.push({type: 'Resultado historico', description: tc.baseline_result_2026_10_05});
    if (!active) {
      test.skip(true, `NO automatizada: ${tc.automation_status}. No equivale a PASS.`);
      return;
    }
    if (tc.id === 'AUT-002' && testInfo.retry > 0) {
      test.skip(true, 'No reintentar login invalido automaticamente.');
    }
    await allFlows[tc.id]({page,tc,testInfo});
  });
}
