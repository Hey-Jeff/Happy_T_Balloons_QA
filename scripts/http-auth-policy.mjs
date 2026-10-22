// Excepción temporal y acotada: SOLO CUENTAS DESECHABLES QA SOBRE UNA IP CONTROLADA.
// HTTP NO cifra credenciales ni cookies; estas condiciones reducen alcance, NO eliminan riesgo.
export const temporaryHttpAuthCaseIds = Object.freeze([
  'AUT-001', // login válido de administrador QA
  'PRO-012', // cliente QA no puede administrar productos
  'PED-005', // checkout con carrito vacío (sin crear pedido)
  'INV-006', // lectura de stock normal (sin movimiento)
]);

/** Verdadero únicamente para un caso individual de lectura, en el host QA conocido. */
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
