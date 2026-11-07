// Registro único de flujos QA02.
// Los archivos se combinan en este orden y el ÚLTIMO que define un ID gana. Desde el 22/10/2026
// qa02-datos-ui.js redefine 56 de los 58 casos, así que la mayoría de los flujos de las olas
// anteriores ya no se ejecutan. Para que una sobrescritura nunca vuelva a ser accidental, el archivo
// que aporta cada caso queda en `flowSource`, se publica como anotación "Flujo" en el reporte y
// scripts/flow-registry.test.mjs falla si cambia sin actualizar la lista esperada.
import { flows } from './index.js';
import { sprintFlows } from './sprint-72h.js';
import { wave2Flows } from './wave2-72h.js';
import { wave3Flows } from './wave3-72h.js';
import { wave4Flows } from './wave4-72h.js';
import { catalogFixFlows } from './catalog-fixes.js';
import { safeHttpFlows } from './qa02-safe-extensions.js';
import { qa02ReadOnlyWave5 } from './qa02-readonly-wave5.js';
import { qa02DatosUi } from './qa02-datos-ui.js';

export const flowSets = Object.freeze([
  ['index.js', flows],
  ['sprint-72h.js', sprintFlows],
  ['wave2-72h.js', wave2Flows],
  ['wave3-72h.js', wave3Flows],
  ['wave4-72h.js', wave4Flows],
  ['catalog-fixes.js', catalogFixFlows],
  ['qa02-safe-extensions.js', safeHttpFlows],
  ['qa02-readonly-wave5.js', qa02ReadOnlyWave5],
  ['qa02-datos-ui.js', qa02DatosUi],
]);

export const allFlows = {};
export const flowSource = {};
for (const [file, set] of flowSets) {
  for (const [id, flow] of Object.entries(set)) {
    allFlows[id] = flow;
    flowSource[id] = file;
  }
}
