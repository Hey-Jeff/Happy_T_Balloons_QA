// Acceso autenticado HTTP limitado a flujos sin operaciones persistentes de negocio.
// Cuentas exclusivas para QA: HTTP no cifra credenciales ni cookies.
// Cada caso se ejecuta por separado; los mutadores permanecen bloqueados.
export const temporaryHttpAuthCaseIds = Object.freeze([
  'AUT-001',
  'PRO-012',
  'PED-005',
  'INV-006',
  'PRO-004',
  'PRO-005',
  'CATE-004',
  'INV-001',
  'PED-007',
  'PED-009',
  'REP-001',
  'REP-002',
  'REP-003',
  'REP-004',
  'REP-005',
  'REP-006',
  'REP-007',
  'REP-008',
]);

export function temporaryHttpAuthAllowed({baseUrl, allowHttp, allowHttpAuth, mode, caseIds}) {
  let url;
  try { url = new URL(baseUrl); } catch { return false; }
  return url.origin === 'http://13.184.33.122'
    && url.pathname === '/'
    && !url.username && !url.password && !url.search && !url.hash
    && allowHttp === 'true'
    && allowHttpAuth === 'true'
    && mode === 'case'
    && Array.isArray(caseIds)
    && caseIds.length === 1
    && temporaryHttpAuthCaseIds.includes(caseIds[0]);
}
