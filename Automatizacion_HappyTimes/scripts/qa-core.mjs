import fs from 'node:fs';
import path from 'node:path';

export const root = path.resolve(import.meta.dirname, '..');
export const manifest = JSON.parse(fs.readFileSync(path.join(root,'qa/cases.json'),'utf8'));
export const cases = manifest.cases;
export const idRE = /^[A-Z]{3,4}-\d{3}$/;
export const implemented = new Set([
  'AUT-001','AUT-002','CAT-001','CAT-002','CAT-004','CAT-006',
  'PRO-004','CLI-006','REP-001','REP-005'
]);
export const statuses = {
  ready: 'ready_verified_against_app',
  draft: 'draft_requires_ui_verification',
  pending: 'pending_implementation',
  na: 'excluded_not_applicable'
};
export function validate() {
  const problems=[]; const seen=new Set();
  for(const tc of cases){
    if(!idRE.test(tc.id)) problems.push(`ID inválido: ${tc.id}`);
    if(seen.has(tc.id)) problems.push(`ID duplicado: ${tc.id}`);
    seen.add(tc.id);
    if(!tc.expected || !tc.steps?.length) problems.push(`Incompleto: ${tc.id}`);
    if(!Object.values(statuses).includes(tc.automation_status)) problems.push(`Estado inválido: ${tc.id}`);
    if(tc.automation_status===statuses.draft && !implemented.has(tc.id)) problems.push(`Draft sin implementación: ${tc.id}`);
    if(tc.automation_status===statuses.ready && !implemented.has(tc.id)) problems.push(`Ready sin implementación: ${tc.id}`);
    for(const dep of tc.dependencies||[]) if(!cases.some(c=>c.id===dep)) problems.push(`Dependencia inexistente: ${tc.id}->${dep}`);
  }
  for(const id of implemented){
    const tc=cases.find(c=>c.id===id);
    if(!tc || ![statuses.draft,statuses.ready].includes(tc.automation_status)) problems.push(`Flujo ${id} sin caso draft/ready`);
  }
  return problems;
}
export function coverage(selected=cases){
  const counts={total:selected.length,ready:0,draft:0,pending:0,not_applicable:0};
  for(const tc of selected){
    if(tc.automation_status===statuses.ready) counts.ready++;
    else if(tc.automation_status===statuses.draft) counts.draft++;
    else if(tc.automation_status===statuses.pending) counts.pending++;
    else if(tc.automation_status===statuses.na) counts.not_applicable++;
  }
  return counts;
}
