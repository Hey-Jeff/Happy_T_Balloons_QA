# QA02 Sprint 72 horas - Ola 2 (16 flujos)

## Alcance

- 105 casos en matriz, **42 borradores**, **55 pendientes**, **8 excluidos N/A**, **0 verificados**. No confundir PASS exploratorio con cobertura formal.
- Ola 2: `PED-001`, `PED-002`, `PED-003`, `PED-005`, `PRO-002`, `PRO-003`, `CATE-003`, `INV-006`, `PED-008`, `CLI-004`, `CLI-005`, `PRO-012`, `ENV-012`, `ENV-001`, `ENV-003`, `AUT-007`.
- La correccion previa de catalogo CAT-001/002/004/008 se conserva intacta. Defecto real pendiente: `/Home/Detalle/8` HTTP 500.
- Cambio en modo `publicos`: **13 pruebas anonimas** en lugar de 9 (se agregan `CLI-003`, `PED-001`, `PED-002`, `PED-003`). Las pruebas de carrito escriben SOLO en la sesion aislada de cada test; no crean pedidos ni pagos.

## Primeras ejecuciones recomendadas

1. Workflow `modo=validar` (cobertura/estructura y unit tests, sin QA_BASE_URL).
2. Workflow `modo=publicos`, `http_auth=false`: corre 13 pruebas. CAT-002/CAT-008 seguiran fallando si el servidor mantiene HTTP 500. PED-002 fallara como **precondicion faltante** si QA no tiene producto activo agotado.
3. Administracion (solo cuando asignen el rol y HTTPS o cuentas QA temporales): `modo=caso`, `case_id=PED-005` o `PRO-002`, `http_auth=true` si sigue el entorno HTTP de pruebas temporal. Nunca usar contrasenas reales en HTTP.

## Dependencias por caso

| ID | Preparacion necesaria |
|---|---|
| PED-001 | Producto activo con stock; agrega al carrito de sesion, sin checkout |
| PED-002 | Producto activo con **stock 0** visible en catalogo |
| PED-003 | Producto activo con **stock >=2**; carrito aislado |
| PED-005 | Sesion autenticada como administrador, carrito vacio |
| PRO-002 | Rol Administrador u Operador; formulario vacio, no crea registros |
| PRO-003 | Rol admin; **QA_ALLOW_MUTATIONS=true y QA_ISOLATED_QA=true**. NO ejecutar con BD compartida. Intenta crear producto de precio negativo: si el servidor tiene un defecto, PODRIA insertarlo. |
| CATE-003 | Rol administrador; envio invalido de categoria vacia |
| INV-006 | Rol admin/operador; producto con stock > minimo |
| PED-008 | Rol admin; base SIN pedidos y `QA_EXPECT_EMPTY_ADMIN_ORDERS=true` |
| CLI-004 | `QA_CLIENT_EMAIL/PASSWORD` de cliente con pedidos |
| CLI-005 | `QA_EMPTY_CLIENT_EMAIL/PASSWORD` de cliente SIN pedidos |
| PRO-012 | `QA_CLIENT_EMAIL/PASSWORD` cliente sin rol admin/operador |
| ENV-012 | Rol admin, formulario zona de entrega vacio |
| ENV-001 | Sesion con carrito y rol autentico; al menos una zona activa |
| ENV-003 | Igual, al menos dos zonas con tarifas distintas |
| AUT-007 | `QA_EXPIRED_RESET_TOKEN` realmente expirado provisto por desarrollo |

## Seguridad / estado de despliegue

- No ejecutar operaciones persistentes (altas de producto, pagos, bloqueo, emails, roles, inventario o pedidos) en BD compartida. `PRO-003` queda **bloqueado por defecto** hasta disponer de una instancia QA aislada y restaurable.
- No convertir errores por falta de datos, rol o ambiente a PASS. Las fallas/errores HTTP 500 deben quedar visibles y registradas.
- Se mantienen `workers:1`, `retries:0`, y capturas/trazas de fallo.
- Los secretos no se guardan en el repositorio ni en el ZIP. Configurarlos desde GitHub Actions Secrets. HTTPS es preferible; el permiso HTTP temporal solo para cuentas desechables.
