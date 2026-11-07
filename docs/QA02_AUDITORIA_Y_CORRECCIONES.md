# QA02 — Auditoría y correcciones de la automatización (06/11/2026)

Rama: `qa02/auditoria-regresion-run13` · Base: `main` @ `7216ffa` · Instancia QA: `http://13.184.33.122` (compartida, HTTP).

## 1. Resumen ejecutivo

- **La regresión de 51 a 34 PASS con el mismo commit no tuvo su origen en el código.** La aplicación cambió entre el 27/10 y el 30/10/2026, y en la base de datos compartida aparecieron datos nuevos. Dos causas comunes explican los 18 casos que pasaron de PASS a FAIL:
  1. **Cambio de UI desplegado**: los filtros (catálogo, Pedidos, Reporte de inventario) se envían al cambiar el `<select>` (`onchange="this.form.submit()"`) y ya no tienen botón "Filtrar"/submit. Además, el panel `/Admin` cambió el título "Dashboard" por "Estadísticas" (AUT-001). Afectó a 10 casos (CAT-003/004/005/006/012, PRO-006, PED-009, REP-006, REP-007, AUT-001).
  2. **Datos ajenos en la BD compartida**: otro usuario creó la categoría inactiva **"Prueba1"** (26/10/2026) y el producto activo **"Prueba1"** (ID 18, ₡0). Las pruebas que comparaban listas completas contra una constante fallaron. Afectó a 8 casos (CAT-001, PRO-003, PRO-004, REP-005, CATE-002/003/004/009).
- `CAT-002` pasó de FAIL a PASS en el mismo intervalo: la aplicación corrigió el HTTP 500 de `/Home/Detalle/{id}`. Saldo: 51 − 18 + 1 = 34.
- Se corrigieron **los 22 FAIL** del run #13. Ninguno resultó ser un defecto de la aplicación: todos eran selectores o esperas obsoletos, aserciones acopladas a datos mutables o precondiciones que ya no se cumplían. Las aserciones no se relajaron; donde había listas fijas, ahora se exige la línea base **y** se compara contra el estado real (antes/después de la propia prueba, filtro contra listado completo). Varias validaciones son más estrictas que antes.
- **Resultado verificado en GitHub Actions (run #15, 06/11/2026): 56 PASS · 0 FAIL · 2 BLOCKED** (antes: 34 · 22 · 2). Unitarias 53/53.
- `AUT-002` y `CATE-012` siguen **BLOCKED** a propósito: necesitan una cuenta desechable o una base aislada (sección 7).
- La auditoría encontró y corrigió además: un flujo oculto de `AUT-002` que probaba una contraseña incorrecta contra la **cuenta admin**; snapshots de pantallas administrativas (clientes, pedidos, bitácora) publicados en el artifact público; un correo personal publicado en el resumen y en `qa/cases.json`; documentación que declaraba 105 casos y un `.env.example` inexistente.

## 2. Estado inicial del repositorio

| Elemento | Estado encontrado |
|---|---|
| Commit | `7216ffa` "Added playwright report" (23/10/2026) |
| Casos en `qa/cases.json` | 58, todos `draft_requires_ui_verification` |
| Ejecutor integral | `scripts/qa02-all-105.mjs` (pese al nombre, ejecuta 58: 17 anónimos + 39 con sesión y 2 BLOCKED) |
| Workflow | `.github/workflows/qa02-todos-105.yml`, con el título "105 casos" |
| Pruebas unitarias | 45/45 PASS (`npm run unit`) |
| Run #11 (40434334952, 27/10) | 51 PASS · 5 FAIL · 2 BLOCKED |
| Run #12 (41029826617, 30/10 08:56 UTC) | Cancelado en el precheck: `QA PRECHECK ERROR: No hay conectividad al sitio QA: fetch failed` (caída puntual del servidor; sin reintento) |
| Run #13 (41117495128, 30/10 19:42 UTC) | 34 PASS · 22 FAIL · 2 BLOCKED |
| Flujos | 9 archivos combinados con `{...a, ...b}`: el último gana. `qa02-datos-ui.js` redefine 55 de los 58 casos; solo `AUT-001` (index.js), `PED-005` (wave2-72h.js) y `CATE-012` (wave4-72h.js) salen de otros archivos. El resto de las olas antiguas es código que no se ejecuta. |

## 3. Análisis de la regresión de 51 a 34 PASS

Fuentes: logs de los jobs (API de Actions), reportes HTML de los artifacts `qa02-reporte-playwright-11` y `-13` (mensajes de error y `error-context.md` con el snapshot ARIA de la página) y el HTML público actual de `/`.

| Caso | Run #11 | Run #13 | Causa común |
|---|---|---|---|
| CAT-003, CAT-004, CAT-005, CAT-006, CAT-012, PRO-006 | PASS | FAIL | UI: catálogo sin botón "Filtrar" (`getByRole('button',{name:/filtrar/i})` → timeout). El log muestra que la navegación `/?busqueda=&categoriaId=4` ya había ocurrido al seleccionar. |
| PED-009, REP-006, REP-007 | PASS | FAIL | UI: los formularios de Pedidos y Reporte de inventario se envían al cambiar el `<select>`; el `button[type=submit]` ya no existe. |
| AUT-001 | PASS | FAIL | UI: `/Admin` responde 200, pero el título es "Estadísticas" y el subtítulo "Panel de administración" (snapshot del run #13). |
| CAT-001, PRO-003, PRO-004, REP-005 | PASS | FAIL | Datos: el producto "Prueba1" (ID 18) aparece en la lista; las pruebas exigían exactamente 17 productos. |
| CATE-002, CATE-003, CATE-004, CATE-009 | PASS | FAIL | Datos: la categoría "Prueba1" (Inactiva, creada el 26/10/2026) aparece en `/Categoria`; las pruebas exigían exactamente 6 categorías y todas activas. El panel admin del run #13 indica "7 Categorías, 6 activas". |
| CAT-002 | FAIL | PASS | La app corrigió el HTTP 500 de `/Home/Detalle/1`. |

Hipótesis descartadas, con evidencia:
- **Conectividad / HTTP 500**: en el run #13 todas las páginas respondieron 200 (las aserciones de estado pasaron). El run #12 sí fue una caída de conectividad, pero no se ejecutaron casos.
- **Sesiones expiradas o cuentas bloqueadas**: todos los casos con sesión iniciaron sesión correctamente (la bitácora del panel muestra "Login exitoso").
- **Dependencias entre casos o conflictos de estado**: cada caso corre en un proceso y un contexto de navegador propios; ningún FAIL depende del orden.
- **Workflows o configuración**: no hubo commits entre los runs #11 y #13 (mismo SHA `7216ffa`).
- **Esperas fijas o timeouts**: no hay `waitForTimeout`. Los timeouts del run #13 son consecuencia directa de los botones eliminados.

## 4. Los 22 FAIL del run #13: causa raíz y evidencia

| Caso | Clasificación | Causa raíz | Evidencia (run #13) |
|---|---|---|---|
| AUT-001 | Selector incorrecto (cambio de UI) | El título "Dashboard" pasó a "Estadísticas" | `getByRole('heading',{name:/Dashboard/i})` not found; snapshot: `heading " Estadísticas"`, `paragraph: Panel de administración` |
| CAT-001 | Datos inconsistentes (BD compartida) | Producto ajeno "Prueba1" | Diff `toEqual`: +1 elemento |
| CAT-003 | Selector / sincronización (cambio de UI) | Botón "Filtrar" eliminado; el select se envía solo | `locator.click: Timeout` en `button /filtrar/` tras navegar a `?categoriaId=4` |
| CAT-004 | Selector / sincronización | Ídem (búsqueda) | Ídem |
| CAT-005 | Selector / sincronización | Ídem | Ídem, `?categoriaId=1` |
| CAT-006 | Selector / sincronización | Ídem | Ídem |
| CAT-012 | Selector / sincronización | Ídem | Ídem |
| PRO-003 | Datos inconsistentes | La verificación "no se guardó" comparaba contra una lista fija | Diff +1 ("Prueba1") |
| PRO-004 | Datos inconsistentes | `toHaveLength(17)` | Recibidas 18 filas |
| PRO-006 | Selector / sincronización | Botón "Filtrar" eliminado | Timeout en `button /filtrar/` |
| CATE-002 | Datos inconsistentes | Lista fija de 6 categorías | Diff +1 ("Prueba1") |
| CATE-003 | Datos inconsistentes | Ídem | Ídem |
| CATE-004 | Datos inconsistentes | Ídem; además exigía que todas estuvieran "Activa" | Snapshot: `Prueba1 … Inactiva`, "7 categoría(s) encontrada(s)" |
| CATE-009 | Datos inconsistentes | Ídem | Diff +1 |
| INV-004 | Defecto del test, luego cambio de UI | (a) `#movSalida` es un radio Bootstrap `btn-check` cubierto por su `<label>`; (b) tras corregir (a), el run #14 mostró que el modal nuevo deshabilita "Registrar" si la salida supera el stock | (a) `<label for="movSalida"> intercepts pointer events`; (b) `<button disabled id="movBtnSubmit">` |
| INV-007 | Selector incorrecto (cambio de UI) | Historial rediseñado: `Fecha | Tipo | Cambio | Stock | Motivo | Usuario` ("+ 5 uds", "20 → 25") | `thead` recibido: Fecha Tipo Cambio Stock Motivo Usuario |
| INV-008 | Selector incorrecto (cambio de UI) | Ídem; los datos (05/10/2026 22:38, Salida −3, 25→22, "Ajuste QA") siguen existiendo | Fila recibida `["05/10/2026 22:38","Salida","− 3 uds","25 22","Ajuste QA",…]` |
| PED-008 | Precondición no satisfecha + cambio de UI | Desde el 25/10/2026 existen pedidos "Pago pendiente" (PED-2026-0019…0023, otros usuarios); en el run #13 además faltaba el botón | Run #11: el filtro devolvió esos pedidos; run #13: timeout en el submit |
| PED-009 | Selector / sincronización | Filtro autoenviado, sin botón | Timeout en `button[type=submit]` tras navegar a `?filtroEstado=Cancelado` |
| REP-005 | Datos inconsistentes | Lista fija de productos | Diff +1 |
| REP-006 | Selector / sincronización | Filtro autoenviado | Timeout tras navegar a `?estadoStock=bajo` |
| REP-007 | Selector / sincronización | Filtro autoenviado | Timeout tras navegar a `?categoriaId=2` |

INV-004, INV-007, INV-008 y PED-008 ya fallaban en el run #11, es decir, son anteriores a la regresión.

## 5. Correcciones implementadas

**Sincronización y selectores (`tests/flows/qa02-datos-ui.js`)**
- `selectAndSubmit()`: cambia el `<select>` y espera **la URL con el valor elegido** (`waitForURL`). Si el `<select>` se envía solo o el formulario no tiene botón, no busca botón; si lo tiene, lo usa. Al final comprueba que el filtro quedó aplicado. Sin esperas fijas.
- `searchAndSubmit()`: búsqueda con Enter (envío implícito, como un usuario), con espera por la URL.
- INV-004: clic en la etiqueta visible del radio y `toBeChecked()`. Para el modal nuevo: se verifica que "Registrar" queda **deshabilitado** con una salida de 50, más un **control** (con los mismos datos, una Entrada lo habilita) que demuestra que el bloqueo viene de la regla de stock. El formulario **nunca se envía**: la prueba no puede escribir aunque exista un defecto. Luego se recarga y se comprueba que el stock no cambió.
- INV-007/INV-008: lectura del historial nuevo (`parseMovement`). Además, cada Entrada/Salida debe cuadrar: *stock anterior + cambio = stock nuevo*.
- AUT-001: acepta "Dashboard" o "Estadísticas", pero exige el texto "Panel de administración" y los menús del rol administrador (Operaciones, Inventario, Análisis, Configuración), lo que se acerca más al criterio "muestra las opciones correspondientes a su rol".

**Datos mutables sin relajar las aserciones**
- `BASELINE_PRODUCTS` y `BASELINE_CATEGORIES`: cada elemento semilla (incluidos los dos "Agenda Planeador") **debe** existir.
- Rechazos (CATE-002, CATE-003, CATE-009, PRO-003): se compara el listado **antes y después** de la propia prueba, lo que detecta cualquier alta, no solo las conocidas.
- Filtros (CAT-005, PED-009, REP-007): el resultado esperado se calcula desde el listado completo, y el filtro debe devolver **todos y solo** esos elementos (antes solo se comprobaba que algunos estuvieran).
- CATE-004: el estado de cada fila es Activa o Inactiva, y las activas del panel deben coincidir **exactamente** con las categorías que el catálogo público ofrece al cliente.
- PRO-004: una fila por producto, nombre, categoría, precio, stock y estado válidos; los productos semilla siguen activos y en sus categorías.
- PED-008: busca en el listado real un estado sin pedidos; si todos tienen pedidos, usa una búsqueda por número inexistente. Siempre exige el mensaje "No se encontraron pedidos". El dato usado queda como anotación.
- REP-001/REP-003 (FAIL nuevos del run #14, del 06/11/2026): a inicio de mes el reporte por defecto está vacío. Se valida el periodo por defecto y la coherencia de su estado vacío, y el resumen y el detalle se validan siempre sobre 2026-01-01..hoy (fecha del servidor).
- CAT-001: anota como **Observación** los productos visibles cuya categoría no es activa (hoy "Prueba1").

**Framework, seguridad y CI**
- `tests/flows/registry.js`: precedencia explícita de los 9 archivos. Cada caso publica la anotación "Flujo" con el archivo que lo aporta, y `scripts/flow-registry.test.mjs` falla si ese origen cambia.
- Eliminado de `tests/flows/index.js` el `AUT-002` sombreado, que **iniciaba sesión con QA_ADMIN_EMAIL y QA_INVALID_PASSWORD**: un cambio de orden de imports podía bloquear la cuenta admin.
- `scripts/qa02-all-105.mjs`: `PLAYWRIGHT_NO_COPY_PROMPT=1` en los casos con sesión. El artifact del run #13 (56 MB, público) incluía snapshots de `/Admin`, `/Pedido`, `/Categoria`… con nombres de clientes, totales y la bitácora de accesos; el del run #14 pesa 0,3 MB y solo contiene los errores. El resumen de Actions muestra la primera línea del error de cada FAIL. Los motivos BLOCKED ya no publican correos.
- `qa/cases.json`: el correo personal de la cuenta cliente se sustituyó por `${QA_CLIENT_EMAIL}` (igual que se hizo con las contraseñas). *Sigue en el historial de Git.*
- `scripts/check-env.mjs`: hasta 3 intentos, solo ante error de red o HTTP 5xx (el caso del run #12); los 4xx fallan de inmediato.
- Workflow: títulos "105 casos" → "58 casos". Se conserva el nombre del archivo para no romper el historial.
- Documentación: README (alcance real, comandos, privacidad, registro de flujos), `.env.example` creado (el README lo pedía y no existía), referencia a una skill inexistente eliminada, `docs/QA02_TODOS_105.md` reescrito y avisos en los documentos históricos que hablan de 105.
- Pruebas unitarias: 45 → 53 (registro de flujos, AUT-002 sin login, `parseMovement`, línea base con duplicados, reintento del precheck, primera línea de error, privacidad del runner).

## 6. Resultado de las pruebas después de los cambios

Verificación ejecutada en GitHub Actions (workflow **QA02 TODOS - 58 casos**, modo `shared-http`, mismas credenciales/secretos que los runs #11 y #13, sin escrituras):

| Ejecución | Commit | PASS | FAIL | BLOCKED |
|---|---|---|---|---|
| [#11](https://github.com/Hey-Jeff/Happy_T_Balloons_QA/actions/runs/40434334952) (27/10) | 7216ffa | 51 | 5 | 2 |
| [#13](https://github.com/Hey-Jeff/Happy_T_Balloons_QA/actions/runs/41117495128) (30/10) | 7216ffa | 34 | 22 | 2 |
| [#14](https://github.com/Hey-Jeff/Happy_T_Balloons_QA/actions/runs/42324732521) (06/11) | 6cea461 | 53 | 3 | 2 |
| **[#15](https://github.com/Hey-Jeff/Happy_T_Balloons_QA/actions/runs/42325204488) (06/11)** | **bc17993** | **56** | **0** | **2** |

- Run #14 dejó 3 FAIL que se analizaron y corrigieron: INV-004 (el modal nuevo deshabilita "Registrar"), REP-001 y REP-003 (dependían del mes en curso: el 06/11 el periodo por defecto no tiene ventas). Run #15 terminó en verde.
- Ningún PASS del run #13 retrocedió (los 34 siguen en PASS).
- `npm run qa:validate`: OK, 58 casos. `npm run unit`: **53/53**. Localmente (Windows, Node 26, Playwright 1.64.1) `npm run test:public`: **17/17** contra la instancia QA.
- Artifact `qa02-reporte-playwright-15`: 0,27 MB. `scan-report-secrets` sin hallazgos; ningún snapshot de página de casos con sesión; la búsqueda de nombres de clientes y del correo personal en el artifact solo encuentra un comentario de código fuente (CLI-004).
- Anotaciones de datos del run #15: CAT-001 "Observación: Productos visibles de categorías no activas: Prueba1 [Prueba1]"; PED-008 "Todos los estados tienen pedidos: búsqueda por un número inexistente"; REP-001 "Periodo por defecto 2026-11-01..2026-11-06 sin pedidos entregados (estado vacío verificado)".

Los PASS siguen siendo **exploratorios** (`draft_requires_ui_verification`): significan que la prueba ejecutó todas sus aserciones contra la UI real, no que el equipo haya aprobado formalmente el caso.

| Caso | #11 | #13 | #14 | #15 |
|---|---|---|---|---|
| AUT-001 | PASS | FAIL | PASS | PASS |
| AUT-002 | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| AUT-005 | PASS | PASS | PASS | PASS |
| CAT-001 | PASS | FAIL | PASS | PASS |
| CAT-002 | FAIL | PASS | PASS | PASS |
| CAT-003 | PASS | FAIL | PASS | PASS |
| CAT-004 | PASS | FAIL | PASS | PASS |
| CAT-005 | PASS | FAIL | PASS | PASS |
| CAT-006 | PASS | FAIL | PASS | PASS |
| CAT-008 | PASS | PASS | PASS | PASS |
| CAT-011 | PASS | PASS | PASS | PASS |
| CAT-012 | PASS | FAIL | PASS | PASS |
| PRO-002 | PASS | PASS | PASS | PASS |
| PRO-003 | PASS | FAIL | PASS | PASS |
| PRO-004 | PASS | FAIL | PASS | PASS |
| PRO-005 | PASS | PASS | PASS | PASS |
| PRO-006 | PASS | FAIL | PASS | PASS |
| PRO-008 | PASS | PASS | PASS | PASS |
| PRO-009 | PASS | PASS | PASS | PASS |
| PRO-012 | PASS | PASS | PASS | PASS |
| CATE-002 | PASS | FAIL | PASS | PASS |
| CATE-003 | PASS | FAIL | PASS | PASS |
| CATE-004 | PASS | FAIL | PASS | PASS |
| CATE-009 | PASS | FAIL | PASS | PASS |
| CATE-012 | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| INV-001 | PASS | PASS | PASS | PASS |
| INV-004 | FAIL | FAIL | FAIL | PASS |
| INV-006 | PASS | PASS | PASS | PASS |
| INV-007 | FAIL | FAIL | PASS | PASS |
| INV-008 | FAIL | FAIL | PASS | PASS |
| PED-001 | PASS | PASS | PASS | PASS |
| PED-002 | PASS | PASS | PASS | PASS |
| PED-003 | PASS | PASS | PASS | PASS |
| PED-005 | PASS | PASS | PASS | PASS |
| PED-006 | PASS | PASS | PASS | PASS |
| PED-007 | PASS | PASS | PASS | PASS |
| PED-008 | FAIL | FAIL | PASS | PASS |
| PED-009 | PASS | FAIL | PASS | PASS |
| PED-011 | PASS | PASS | PASS | PASS |
| CLI-002 | PASS | PASS | PASS | PASS |
| CLI-003 | PASS | PASS | PASS | PASS |
| CLI-004 | PASS | PASS | PASS | PASS |
| CLI-005 | PASS | PASS | PASS | PASS |
| CLI-006 | PASS | PASS | PASS | PASS |
| CLI-007 | PASS | PASS | PASS | PASS |
| ENV-001 | PASS | PASS | PASS | PASS |
| ENV-002 | PASS | PASS | PASS | PASS |
| ENV-003 | PASS | PASS | PASS | PASS |
| ENV-006 | PASS | PASS | PASS | PASS |
| ENV-012 | PASS | PASS | PASS | PASS |
| REP-001 | PASS | PASS | FAIL | PASS |
| REP-002 | PASS | PASS | PASS | PASS |
| REP-003 | PASS | PASS | FAIL | PASS |
| REP-004 | PASS | PASS | PASS | PASS |
| REP-005 | PASS | FAIL | PASS | PASS |
| REP-006 | PASS | FAIL | PASS | PASS |
| REP-007 | PASS | FAIL | PASS | PASS |
| REP-008 | PASS | PASS | PASS | PASS |

## 7. Estado de los dos BLOCKED

**AUT-002 — Inicio de sesión con credenciales incorrectas.** El flujo vigente nunca intenta iniciar sesión (`testInfo.skip`).
- Por qué sigue bloqueado: cada ejecución consume un intento fallido. La cuenta cliente QA ya quedó bloqueada el 23/10/2026 (bloqueo tras 3 intentos), y la cuenta admin es compartida por todo el equipo.
- Qué se necesita (cualquiera de las dos opciones):
  1. **Cuenta desechable exclusiva** en la instancia actual: `QA_LOCKOUT_EMAIL` (usuario Cliente, sin datos, que nadie más use) y `QA_INVALID_PASSWORD`. Para que el contador no se acumule entre ejecuciones, el flujo debe hacer **1 intento incorrecto y después 1 login correcto**, lo que requiere también `QA_LOCKOUT_PASSWORD`. Habilitarlo exige **autorización explícita**, porque cada run hace un intento fallido real sobre el servidor compartido.
  2. **QA aislado** (preferible): el mismo flujo con `QA_ISOLATED_BASE_URL` y restablecimiento de la BD.
- Validación esperada: la URL sigue en `/Cuenta/Login` y aparece un mensaje genérico que no revela si el correo existe.

**CATE-012 — Inactivación de una categoría con productos asociados.** El flujo existe (`tests/flows/wave4-72h.js`) y está protegido por `isolated()`.
- Por qué sigue bloqueado: inactiva una categoría real (escritura persistente). Además, el defecto conocido (QA02 del 05/10: "Failed") hace que, si la app falla, la categoría quede inactiva en la BD compartida.
- Evidencia relacionada (06/11/2026): la categoría "Prueba1" está Inactiva, pero su producto "Prueba1" se sigue mostrando en el catálogo público, lo que es coherente con el defecto.
- Qué se necesita: el workflow en modo `isolated-qa` con
  - secreto `QA_ISOLATED_BASE_URL`: HTTPS, raíz, hostname con qa/test/staging;
  - `QA_ISO_ADMIN_EMAIL`, `QA_ISO_ADMIN_PASSWORD`, `QA_ISO_CLIENT_EMAIL`, `QA_ISO_CLIENT_PASSWORD`;
  - `QA_RESETTABLE_DB_CONFIRMATION=YES` y `QA_NO_REAL_TRANSACTIONS=true`;
  - `QA_CATEGORY_WITH_PRODUCTS` (p. ej. "Belleza", con "Colonia Hombre Versace");
  - la entrada `confirm_isolated=ISOLATED_QA_RESETTABLE_CONFIRMED`;
  - un procedimiento de restauración de la BD tras cada run.
  
  Resultado esperado: alerta al administrador y la categoría permanece Activa. Con el defecto actual, el caso terminaría en FAIL real.

## 8. Diferencias entre los 105 casos originales y los 58 actuales

| Paso | Commit | Casos | Motivo documentado |
|---|---|---|---|
| 105 → 99 | `d69aead` (22/10/2026) | −6: AUT-004, AUT-006, AUT-007, AUT-011, AUT-012, AUT-013 | Correo/2FA: requieren buzón (mensaje del commit y README) |
| 99 → 58 | `5012d94` "Unblocked the blocked tcs" (23/10/2026) | −41 | El commit no da motivos; el README (sección "Errores conocidos") los agrupa: escrituras en servidor compartido, SINPE, N/A, `ENV-011`, sin datos (`CAT-009`, `CATE-006`). Los flujos de escritura se borraron de wave3/wave4 y siguen en el historial (`57b683c`). |

**Casos vigentes (58), todos automatizados (flujo Playwright, estado `draft_requires_ui_verification`):**
AUT-001, AUT-002\*, AUT-005, CAT-001, CAT-002, CAT-003, CAT-004, CAT-005, CAT-006, CAT-008, CAT-011, CAT-012, PRO-002, PRO-003, PRO-004, PRO-005, PRO-006, PRO-008, PRO-009, PRO-012, CATE-002, CATE-003, CATE-004, CATE-009, CATE-012\*, INV-001, INV-004, INV-006, INV-007, INV-008, PED-001, PED-002, PED-003, PED-005, PED-006, PED-007, PED-008, PED-009, PED-011, CLI-002, CLI-003, CLI-004, CLI-005, CLI-006, CLI-007, ENV-001, ENV-002, ENV-003, ENV-006, ENV-012, REP-001 … REP-008. (\* BLOCKED en la instancia compartida.)

**Casos retirados (47):**

| ID | Escenario | Resultado Excel 05/10 | Motivo | ¿Recuperable? |
|---|---|---|---|---|
| AUT-003 | Bloqueo temporal por intentos fallidos | Untested | Bloquea una cuenta por intentos fallidos; requiere cuenta desechable en QA aislado (5012d94) | Recuperable con QA_LOCKOUT_EMAIL en QA aislado |
| AUT-004 | Recuperación de contraseña con correo registrado | Untested | Requiere buzón de correo / 2FA (eliminado en d69aead, 105→99) | Recuperable con buzón de pruebas (p. ej. Mailpit/MailHog) en QA aislado |
| AUT-006 | Cambio de contraseña mediante enlace válido | Untested | Requiere buzón de correo / 2FA (eliminado en d69aead, 105→99) | Recuperable con buzón de pruebas (p. ej. Mailpit/MailHog) en QA aislado |
| AUT-007 | Uso de enlace de recuperación expirado | Untested | Requiere buzón de correo / 2FA (eliminado en d69aead, 105→99) | Recuperable con buzón de pruebas (p. ej. Mailpit/MailHog) en QA aislado |
| AUT-008 | Creación de un rol por parte del administrador | Untested | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| AUT-009 | Asignación de un rol a un usuario | Untested | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| AUT-010 | Eliminación o inactivación de un rol existente | Untested | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| AUT-011 | Autenticación de dos factores con código correcto | Untested | Requiere buzón de correo / 2FA (eliminado en d69aead, 105→99) | Recuperable con buzón de pruebas (p. ej. Mailpit/MailHog) en QA aislado |
| AUT-012 | Autenticación de dos factores con código incorrecto | Untested | Requiere buzón de correo / 2FA (eliminado en d69aead, 105→99) | Recuperable con buzón de pruebas (p. ej. Mailpit/MailHog) en QA aislado |
| AUT-013 | Autenticación de dos factores con código expirado | Untested | Requiere buzón de correo / 2FA (eliminado en d69aead, 105→99) | Recuperable con buzón de pruebas (p. ej. Mailpit/MailHog) en QA aislado |
| CAT-007 | Ordenamiento del catálogo | Blocked | N/A: funcionalidad inexistente en la app (Excel: Blocked) (5012d94) | No recuperar sin que exista la funcionalidad (decisión de producto) |
| CAT-009 | Producto inactivo o no publicado oculto al cliente | Passed | Sin datos en la UI (no hay producto/categoría inactiva) al 23/10 (5012d94) | CATE-006 hoy ejecutable en lectura (categoría inactiva "Prueba1" desde 26/10) — requiere autorización de alcance; CAT-009 necesita producto inactivo |
| CAT-010 | Intento de publicar un producto con información incompleta | Blocked | N/A: funcionalidad inexistente en la app (Excel: Blocked) (5012d94) | No recuperar sin que exista la funcionalidad (decisión de producto) |
| PRO-001 | Creación de producto con datos válidos | Passed | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| PRO-007 | Actualización de un producto existente | Passed | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| PRO-010 | Inactivación de un producto activo | Passed | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| PRO-011 | Reactivación de un producto inactivo | Passed | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| CATE-001 | Creación de una categoría nueva | Passed | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| CATE-005 | Visualización cuando no existen categorías activas | Untested | Requiere BD sin categorías activas (QA aislado) (5012d94) | Solo en QA aislado |
| CATE-006 | Categoría inactiva oculta para el cliente | Passed | Sin datos en la UI (no hay producto/categoría inactiva) al 23/10 (5012d94) | CATE-006 hoy ejecutable en lectura (categoría inactiva "Prueba1" desde 26/10) — requiere autorización de alcance; CAT-009 necesita producto inactivo |
| CATE-007 | Actualización de una categoría existente | Passed | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| CATE-008 | Actualización de la jerarquía de categorías | Blocked | N/A: funcionalidad inexistente en la app (Excel: Blocked) (5012d94) | No recuperar sin que exista la funcionalidad (decisión de producto) |
| CATE-010 | Inactivación de una categoría existente | Passed | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| CATE-011 | Reactivación de una categoría inactiva | Passed | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| INV-002 | Registro de una entrada de inventario | Passed | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| INV-003 | Registro de una salida de inventario válida | Passed | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| INV-005 | Alerta cuando el stock alcanza el mínimo definido | Passed | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| INV-009 | Actualización de inventario al confirmar un pedido | Passed | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| PED-004 | Checkout con carrito y datos válidos | Passed | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| PED-010 | Cambio válido de estado de un pedido | Untested | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| PED-012 | Cancelación de pedido y actualización del inventario | Untested | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| CLI-001 | Registro de cliente con datos válidos | Untested | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| PAG-001 | Registro de pago mediante SINPE para un pedido pendiente | Untested | Pago SINPE: requiere sandbox y QA aislado (5012d94) | Recuperable solo con sandbox SINPE oficial |
| PAG-002 | Pago SINPE con datos requeridos incompletos | Untested | Pago SINPE: requiere sandbox y QA aislado (5012d94) | Recuperable solo con sandbox SINPE oficial |
| PAG-003 | Intento de segundo pago sobre un pedido ya pagado | Untested | Pago SINPE: requiere sandbox y QA aislado (5012d94) | Recuperable solo con sandbox SINPE oficial |
| PAG-004 | Actualización del pedido después de un pago SINPE exitoso | Untested | Pago SINPE: requiere sandbox y QA aislado (5012d94) | Recuperable solo con sandbox SINPE oficial |
| PAG-005 | Pago con tarjeta aprobado | Blocked | N/A: funcionalidad inexistente en la app (Excel: Blocked) (5012d94) | No recuperar sin que exista la funcionalidad (decisión de producto) |
| PAG-006 | Pago con tarjeta rechazado por fondos insuficientes | Blocked | N/A: funcionalidad inexistente en la app (Excel: Blocked) (5012d94) | No recuperar sin que exista la funcionalidad (decisión de producto) |
| PAG-007 | Pago con tarjeta vencida | Blocked | N/A: funcionalidad inexistente en la app (Excel: Blocked) (5012d94) | No recuperar sin que exista la funcionalidad (decisión de producto) |
| PAG-008 | Pago con tarjeta con datos obligatorios incompletos | Blocked | N/A: funcionalidad inexistente en la app (Excel: Blocked) (5012d94) | No recuperar sin que exista la funcionalidad (decisión de producto) |
| ENV-004 | Continuar sin seleccionar una zona de entrega | Blocked | N/A: funcionalidad inexistente en la app (Excel: Blocked) (5012d94) | No recuperar sin que exista la funcionalidad (decisión de producto) |
| ENV-005 | Programación de fecha y hora de entrega disponibles | Untested | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| ENV-007 | Selección de un horario no disponible | Untested | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| ENV-008 | Cambio de programación de entrega | Untested | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| ENV-009 | Creación de una zona de entrega | Untested | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| ENV-010 | Edición de una zona de entrega | Untested | Escribe en la BD compartida; requiere QA aislado restaurable (eliminado en 5012d94) | Recuperable: flujos en git (57b683c, wave2/3/4) + QA aislado con reset |
| ENV-011 | Eliminación de una zona sin pedidos asociados | Untested | Sin implementación; además escribe (elimina zona) (5012d94) | Implementar en QA aislado |

Resumen: 8 casos son de **funcionalidad inexistente** (N/A) y no deben recuperarse sin una decisión de producto. 6 necesitan correo, 4 un sandbox SINPE, y 28 (escrituras, bloqueo, vacío, `ENV-011`) un **QA aislado**. Hay 2 sin datos, de los cuales `CATE-006` sería hoy ejecutable en solo lectura gracias a "Prueba1"; no se reincorporó porque cambia el alcance acordado.

**Cobertura real: 58/105 casos tienen automatización y 56/105 se ejecutan en la instancia compartida. No se declara cobertura del 100 % de la matriz original.**

## 9. Defectos de aplicación que no pueden solucionarse desde el repositorio QA

| # | Defecto / hallazgo | Evidencia | Caso relacionado | Estado |
|---|---|---|---|---|
| D1 | Un producto activo de una categoría **inactiva** se muestra en el catálogo público ("Prueba1", categoría "Prueba1" Inactiva) | `/` del 06/11 (producto ID 18); `/Categoria` del run #13 ("Prueba1 · Inactiva"); anotación "Observación" de CAT-001 | CATE-012, CATE-006 | Abierto; reproducir en QA aislado |
| D2 | Existe un producto con precio **₡0** ("Prueba1"), aunque el formulario exige un mínimo de 0.01; posible falta de validación en el servidor | `/Producto` del run #13: `Prueba1 … ₡0 … 0 … Activo` | PRO-003 | Candidato; reproducir con POST directo en QA aislado |
| D3 | Inactivar una categoría con productos no advierte al administrador | Excel QA02 05/10: Failed | CATE-012 | Conocido; BLOCKED |
| D4 | El filtro "Sin stock" del Reporte de inventario devuelve todos los productos | Nota del 22/10/2026 en REP-006 (no se volvió a verificar) | REP-006 | Pendiente de reverificar |
| D5 | "Stock actual" de Sopa De Letras = 3, pero su último movimiento deja 5: hay cambios de stock (¿pedidos?) sin movimiento en el historial | Historial del run #13 | INV-009 (retirado) | Candidato |
| — | `/Home/Detalle/{id}` respondía HTTP 500 | Run #11 CAT-002 | CAT-002 | **Corregido por la app** entre el 27 y el 30/10 |

Ningún FAIL vigente se debe a un defecto de la aplicación. D1, D2 y D5 son observaciones fuera del criterio de aceptación de los casos actuales; no se convirtieron en FAIL porque eso alteraría el alcance sin autorización.

## 10. Próximos pasos

1. **Revisar y fusionar el PR**; luego ejecutar QA02 TODOS en `main`.
2. **Proteger la BD compartida**: acordar con el equipo que no se creen datos ("Prueba1") en `13.184.33.122`, o publicar los cambios. La causa raíz de la mitad de la regresión fue un alta ajena.
3. **Aviso de despliegues**: los cambios de UI (filtros, panel, historial, modal de inventario) llegaron sin aviso. Conviene un `data-testid` estable en filtros, tablas y modales.
4. **Eliminar los artifacts públicos de los runs #11 y #13** (contienen snapshots con nombres de clientes y la bitácora) y valorar purgar del historial el correo personal de `qa/cases.json`.
5. **QA aislado (HTTPS, BD restaurable)** para habilitar CATE-012, AUT-002 y los 28 casos retirados por escritura, bloqueo o BD vacía. Sus flujos se pueden recuperar de `57b683c` (wave2/3/4).
6. Buzón de pruebas (Mailpit/MailHog) para los 6 casos de correo/2FA; sandbox SINPE para PAG-001..004.
7. Limpiar los flujos sombreados de las olas antiguas, ya documentados por `registry.js`, y cambiar a `ready_verified_against_app` los casos que el equipo valide. Hoy todos los PASS son exploratorios.
8. Reproducir D1, D2 y D5 en QA aislado y registrarlos como defectos.
