import { cases, statuses } from './qa-core.mjs';

// Este informe describe el alcance, NO declara pruebas aprobadas.
const selected = new Set(`
CAT-001 CAT-002 CAT-004 CAT-005 CAT-006 CAT-008 CAT-011 CAT-012
CLI-003 CLI-006 PRO-006 PED-001 PED-002 PED-003
AUT-001 PRO-012 PED-005 INV-006 PRO-004 PRO-005 CATE-004 INV-001
PED-007 PED-009 REP-001 REP-002 REP-003 REP-004 REP-005 REP-006 REP-007 REP-008
PRO-002 CATE-003 ENV-012 ENV-001 ENV-003 ENV-006
`.trim().split(/\s+/));
const applicable = cases.filter(c => c.automation_status !== statuses.na);
const backlog = applicable.filter(c => !selected.has(c.id));
const excluded = cases.filter(c => c.automation_status === statuses.na);
if (cases.length !== 99 || selected.size !== 38 || backlog.length !== 53 || excluded.length !== 8) {
  throw new Error(`Se altero la matriz sin actualizar el reporte: ${cases.length} total, ${selected.size} lote, ${backlog.length} pendientes, ${excluded.length} N/A`);
}
console.log('');
console.log('### Inventario de cobertura: no confundir programado con aprobado');
console.log(`Casos totales: ${cases.length}; aplicables: ${applicable.length}; programados en este lote: ${selected.size}; fuera del lote: ${backlog.length}; excluidos N/A: ${excluded.length}.`);
console.log('**Las pruebas ejecutadas solo se consideran PASS si Playwright confirma el resultado**.');
console.log('');
console.log('| Modulo | Fuera del lote (pendiente de pruebas) |');
console.log('|---|---|');
for (const module of [...new Set(cases.map(c => c.module))]) {
  const list = backlog.filter(c => c.module === module).map(c => c.id);
  if (list.length) console.log(`| ${module} | ${list.join(', ')} |`);
}
console.log('');
console.log('`ENV-011` sigue sin implementar. Los 8 N/A requieren ratificacion del alcance.');
console.log('Los casos de escritura necesitan BD de QA restaurable y validacion previa de sus datos; HTTP no equivale a permiso automatico de escritura.');
