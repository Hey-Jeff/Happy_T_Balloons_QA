import { cases, statuses } from './qa-core.mjs';
const previous38 = new Set(`
CAT-001 CAT-002 CAT-004 CAT-005 CAT-006 CAT-008 CAT-011 CAT-012
CLI-003 CLI-006 PRO-006 PED-001 PED-002 PED-003
AUT-001 PRO-012 PED-005 INV-006 PRO-004 PRO-005 CATE-004 INV-001
PED-007 PED-009 REP-001 REP-002 REP-003 REP-004 REP-005 REP-006 REP-007 REP-008
PRO-002 CATE-003 ENV-012 ENV-001 ENV-003 ENV-006
`.trim().split(/\s+/));
const five = new Set(['CAT-009','CATE-006','ENV-002','CLI-004','CLI-005']);
const selected = new Set([...previous38,...five]);
const applicable=cases.filter(c=>c.automation_status!==statuses.na);
const backlog=applicable.filter(c=>!selected.has(c.id));
const na=cases.filter(c=>c.automation_status===statuses.na);
if(cases.length!==99 || applicable.length!==91 || previous38.size!==38 || selected.size!==43 || backlog.length!==48 || na.length!==8){
  throw new Error(`La matriz cambio: ${cases.length} total, ${applicable.length} aplicables, ${selected.size} programados, ${backlog.length} fuera de lotes, ${na.length} N/A`);
}
console.log('### Inventario QA02 luego de la nueva ola (NO significa PASS)');
console.log(`99 totales; 91 aplicables; 38 en lote previo; 5 adicionales programados; 48 aun fuera de lotes; 8 excluidos N/A.`);
console.log('Los 5 nuevos pueden terminar BLOCKED por datos ausentes y NO contaran como PASS.');
console.log('| Modulo | Fuera de los lotes |');
console.log('|---|---|');
for(const mod of [...new Set(cases.map(c=>c.module))]){
  const group=backlog.filter(c=>c.module===mod).map(c=>c.id);
  if(group.length)console.log(`| ${mod} | ${group.join(', ')} |`);
}
