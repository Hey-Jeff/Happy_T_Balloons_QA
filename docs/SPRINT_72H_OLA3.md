# QA02 – Sprint 72h – Ola 3

## Estado tras integrar este paquete

- 105 casos; **64 borradores implementados**; **33 pendientes**; 8 N/A; 0 declarados `ready_verified_against_app`.
- 13 pruebas públicas siguen seleccionadas por `modo=publicos`; últimas 11 PASS / 2 FAIL por HTTP 500 en `/Home/Detalle/8` (ejecución #19).
- Ola 3 agrega **22 flujos**: CAT-003, CAT-009, CATE-005, CATE-006, CLI-007, PRO-001, PRO-007, PRO-008, PRO-010, PRO-011, CATE-001, CATE-002, CATE-007, CATE-010, CATE-011, INV-002, INV-003, INV-004, INV-007, INV-008, ENV-009, ENV-010.
- **La instalación NO significa que se probaron 22 flujos contra AWS.** Los escenarios de escritura están bloqueados por defecto.

## Cómo probar sin riesgo (ahora)

1. Ejecutar `modo=validar` desde GitHub Actions. Deben pasar 105 casos, 13 pruebas unitarias y sintaxis.
2. Ejecutar `modo=publicos` sin `http_auth`: siguen siendo 13 escenarios existentes. Los HTTP 500 CAT-002 y CAT-008 deben continuar visibles hasta arreglo de desarrollo.
3. No ejecutar `modo=todo` contra QA compartida. Solo ejecutar los IDs de Ola 3 con fixture disponible y roles/servidor autorizados.

## Grupos de Ola 3

- **Negativos con fixtures y sin escritura:** CAT-003 (QA_EXPECT_EMPTY_CATALOG), CAT-009 (QA_INACTIVE_PRODUCT_NAME), CATE-005 (QA_EXPECT_EMPTY_CATEGORIES), CATE-006 (QA_INACTIVE_CATEGORY_NAME), CLI-007 (QA_FOREIGN_ORDER_ID y QA_CLIENT_EMAIL/PASSWORD).
- **Productos, categorías, inventario y zonas que escriben:** requieren `QA_ISOLATED_QA=true` y `QA_ALLOW_MUTATIONS=true`, además de rol Admin/Operador y DB aislada con respaldo/reset.
- **Inventario:** configurar `QA_INVENTORY_PRODUCT_NAME` como producto dedicado, con stock suficiente. Cada caso altera stock y requiere reset del entorno.
- **Zonas de entrega:** se crean registros temporales independientes, que requieren reset posterior. No hay eliminación permanente implementada.
- En **ningún caso** introducir claves reales ni enviar pagos desde la instancia HTTP actual.

## Próximas dependencias a pedirle a desarrollo

1. Rol Administrador; cuenta Cliente de QA y `QA_FOREIGN_ORDER_ID` de otro usuario para seguridad.
2. Instancia staging/QA aislada, restaurable, preferiblemente HTTPS.
3. Semillas: categoría activa, producto inactivo, categoría inactiva, un producto de inventario dedicado; estado vacío para pruebas especiales.
4. Corregir HTTP 500 `/Home/Detalle/{id}`. Aportar stack trace desde los logs del servidor.
5. Mail sandbox, 2FA y webhook SINPE sandbox para siguientes casos.

**Definición de terminado:** una prueba solo pasa a `ready_verified_against_app` después de ejecutar contra UI actual, comparar estado esperado y conservar evidencia. `SKIPPED`, precondición faltante y error real nunca equivalen a PASS.
