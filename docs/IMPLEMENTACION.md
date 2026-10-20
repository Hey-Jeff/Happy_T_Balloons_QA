# Plan técnico de automatización QA02

## Arquitectura

`qa/cases.json` es la fuente estructurada extraída del Excel; `scripts/qa.mjs` selecciona casos y obliga a comprobar cobertura; `tests/qa02.spec.js` registra casos como tests Playwright; `tests/flows/index.js` contiene las implementaciones. El skill de Claude Code es opcional y NO se utiliza para la ejecución por terceros.

## Estados (no confundir con resultados del test)

| Estado | Significado |
|---|---|
| `ready_verified_against_app` | Test automatizado validado en la versión actual contra aplicación QA (ninguno a la entrega) |
| `draft_requires_ui_verification` | Flujo Playwright escrito, selectores/aserciones requieren comprobarse contra UI real (10) |
| `pending_implementation` | Caso documentado, sin implementación automatizada (87) |
| `excluded_not_applicable` | Funcionalidad bloqueada/N/A según QA02; revisar cuando exista (8) |

`Passed`, `Failed`, `Blocked`, `Untested` del Excel son **históricos**, no resultados de esta suite.

## Etapas recomendadas

### Etapa 1. Smoke / regresión no destructiva

AUT-001, AUT-002 (solo un login incorrecto), CAT-001, CAT-002, CAT-004, CAT-006, PRO-004, CLI-006, REP-001, REP-005 son 10 BORRADORES. Se necesita comprobar `form`, inputs, selectores y contenido auténtico. La prueba `CAT-002` reproduce un caso marcado con fallo en QA02; no asumir que está corregido.

### Etapa 2. CRUD / carrito e inventario

Implementar PRO, CATE, PED, INV con datos independientes por caso, identificadores únicos por ejecución (`qa_${Date.now()}`) y limpieza por API/BD, *no* depender de IDs fijos (`5`, `9999`) si cambian las semillas. Aserciones de backend para persistencia y stock. No ejecutar acciones destructivas en paralelo.

### Etapa 3. Servicios externos y tiempo

AUT-004 a AUT-013 necesitan mail sandbox/2FA/tiempo controlado. PAG-001 a PAG-004 necesitan webhook autenticado y servidor sandbox; usar `APIRequestContext` y verificar que el pedido cambia exactamente una vez (idempotencia). Pedidos, ENT y reportes requieren semillas con fechas y saldos calculados. Para pruebas de fecha, usar hora fijada o dinámica y validar restricciones.

### Etapa 4. Reportes y CI

Añadir validaciones numéricas de exportaciones CSV y totales de ventas/inventario, comparar con datos conocidos. Configurar un runner accesible a la red QA, artefactos y permisos reducidos. CI debe reportar cobertura de casos junto con la tasa PASS de casos efectivamente corridos.

## Política de seguridad

- Nada de contraseñas en commits, consola, screenshots divulgados ni `cases.json`.
- En `qa/cases.json`, las contraseñas copiadas del Excel fueron reemplazadas por `${QA_*}`.
- Nunca enviar un webhook financiero a endpoints productivos desde pruebas automatizadas.
- Tests que crean o cancelan pedidos, cambian inventario, bloquean cuentas o mandan email requieren autorización y datos descartables.
- Evitar probar contra producción; usa instancia local o staging/QA con respaldos.

## Información que falta para completarlo

1. ZIP del código (o enlace al repositorio) de Happy Times Balloons, rama/commit que se probará.
2. URL actual del entorno de QA accesible por el tester.
3. Roles/cuentas QA, base de datos/seeds y cómo resetearla.
4. Si SINPE, correo y otras integraciones tienen sandbox/mock.

Con eso se pueden inspeccionar rutas reales y sustituir los flujos de ejemplo por pruebas ejecutables verificadas, ampliar módulo por módulo hasta cubrir 105/105 o documentar los N/A.
