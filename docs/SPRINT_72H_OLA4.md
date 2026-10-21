# QA02 | Sprint 72 h | Ola 4

## Resultado de implementación

- 105 casos de la matriz, 97 aplicables y 8 ya excluidos como N/A.
- **96 borradores de automatización**, **1 caso pendiente** (`ENV-011`), **0 formalmente verificados**.
- Esta ola agrega **32 flujos** en `tests/flows/wave4-72h.js`.
- El comando `modo=publicos` pasa de 13 a **14 pruebas**, al incorporar `PRO-006`: inexistencia de producto por URL, respuesta HTTP 404.
- 16 pruebas unitarias en total, y validación estructural de los 105 casos; NO sustituyen las pruebas end-to-end en AWS.

## Dependencias y bloqueos

| Casos | Requisito | Acciones permitidas |
|---|---|---|
| PRO-006 | Producto inexistente en ruta `/Home/Detalle/2147483647` | Solo GET público. Puede detectar nuevo defecto HTTP 500. |
| ENV-006/007 | Admin/operador QA, pedido sembrado, franjas de entrega | GET solamente, sin persistencia |
| AUT-003 a 006 | Cuenta QA desechable, inbox/token QA, instancia aislada | Bloqueado por defecto: cambio de contraseña, correo, bloqueo |
| AUT-008 a 010 | Admin, rol QA02_*, usuario de prueba | Bloqueado por defecto: creación/asignación/baja |
| AUT-011 a 013 | Cuentas 2FA y códigos de prueba separados | Bloqueado por defecto, no adivinar ni reintentar OTP |
| PRO-009 / CATE-009 / CATE-012 | Admin y registros preparados | Bloqueado por defecto: POST y cambios de estado |
| INV-005 / INV-009 | Stock controlado, base restaurable | Bloqueado por defecto: movimiento y compra |
| PED-004/006/010/011/012 | Cuentas y pedidos semilla, aislamiento | Bloqueado por defecto: checkout/estados/notificaciones |
| CLI-001/002 | Emails y claves QA temporales | Bloqueado por defecto: altas/correos |
| PAG-001/002/003/004 | Pedido PagoPendiente, token **sandbox** SINPE, datos ficticios | Bloqueado por defecto: webhook/pagos |
| ENV-002/005/008 | Pedido y zonas/horarios aislados | Bloqueado por defecto: programación persistente |
| ENV-011 | Controlador no contiene `Eliminar`; sí permite `CambiarDisponibilidad` | Sigue `pending_implementation`; consultar al responsable funcional. |

**No lanzar modo `all` ni `module` sobre la IP pública QA compartida.** Los casos privados pedirán credenciales de QA y casi todas las mutaciones exigen un host HTTPS diferente y restaurable.

## Guardas de seguridad para casos persistentes

La función `isolated()` marca como SKIPPED/BLOQUEADO los escenarios persistentes salvo que **todos** estos criterios sean verdaderos:

- `QA_ALLOW_MUTATIONS=true`
- `QA_ISOLATED_QA=true`
- `QA_RESETTABLE_DB=YES`
- `QA_BASE_URL` comienza por `https://`, no contiene la IP QA pública `13.184.33.122`
- `QA_ISOLATED_BASE_URL` coincide exactamente con `QA_BASE_URL`

Los flujos SINPE añaden `QA_SINPE_SANDBOX=true` y `QA_NO_REAL_TRANSACTIONS=true`. Estos flags **no crean** el aislamiento o sandbox: desarrollo debe comprobarlo antes de configurarlos. Nunca habilitarlos solo para hacer pasar las pruebas.

Todas las cuentas, tokens, números, pedidos y correos de prueba se suministran por variables de entorno/secrets. No colocar credenciales, tokens, datos de pago ni información privada en Git ni en tickets.

## Limitaciones de cobertura a resolver

1. CAT-002 y CAT-008 detectan HTTP 500 al abrir `/Home/Detalle/8`, problema no corregible desde el repositorio de pruebas.
2. Varios escenarios requieren que desarrollo prepare IDs/usuarios/productos/fechas independientes; sin estos, la ejecución registra SKIPPED/BLOQUEADO y **nunca PASS**.
3. AUT-004 comprueba enlace en modo desarrollo; con SMTP real hace falta verificar su entrega a un buzón QA. Los pasos de la matriz no siempre coinciden con datos actuales.
4. INV-009 necesita un producto concreto con stock antes/después; el helper selecciona el producto sembrado indicado por `QA_ORDER_PRODUCT_ID`.
5. PAG-004 necesita un pedido SINPE pendiente y un webhook de sandbox que efectivamente lo corresponda.
6. ENV-011 pendiente: el backend solo tiene cambiar disponibilidad de zonas; no hay eliminación implementada.
7. Es obligatorio revisar los PASS contra el criterio de aceptación; el estado sigue `draft_requires_ui_verification`.

## Uso inmediato en GitHub Actions

1. `modo=validar`: comprobar integridad de los 105 casos y ejecutar **16 pruebas unitarias**.
2. `modo=publicos`, `http_auth=false`: ejecutar **14 pruebas**, sin credenciales. Registrar fallas HTTP 500 sin ocultarlas.
3. Solo una vez proporcionado entorno HTTPS aislado, rol Admin y fixtures: iniciar ejecuciones de un caso cada vez. No permitir reintentos automáticos con credenciales o tokens de un solo uso.

El instalador aplica únicamente los archivos de Ola 4 y aborta si `main` ya no es el commit de Ola 3, con el fin de evitar sobrescrituras inadvertidas.
