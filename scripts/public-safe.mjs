// Solo escenarios anonimos sin credenciales: lectura, formulario vacio y carrito efimero de sesion.
// PED-001/003 NO confirman pedidos ni pagos; se aislan por contexto de Playwright.
// AUT-005 y CLI-002 envían formularios que la aplicación debe rechazar (correo no registrado / duplicado).
// NO agregar pruebas que escriban cuentas, productos, inventario o pedidos en este conjunto.
export const publicDraftIds = new Set([
  'CAT-001', 'CAT-002', 'CAT-003', 'CAT-004', 'CAT-005',
  'CAT-006', 'CAT-008', 'CAT-011', 'CAT-012',
  'CLI-002', 'CLI-003', 'CLI-006', 'PRO-006', 'PED-001', 'PED-002', 'PED-003',
  'AUT-005'
]);
