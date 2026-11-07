# QA02 — Una sola ejecución para los 58 casos vigentes

> El archivo conserva el nombre `QA02_TODOS_105.md` (y el workflow `qa02-todos-105.yml`) para no romper enlaces ni el historial de Actions. El alcance vigente es de **58 casos**; la matriz original del Excel tenía 105. Diferencias y motivos: [QA02_AUDITORIA_Y_CORRECCIONES.md §8](QA02_AUDITORIA_Y_CORRECCIONES.md).

Inicia **QA02 TODOS - 58 casos en una ejecución** en GitHub Actions (modo `shared-http`); no hay que ejecutar cada caso individualmente.

- 58 filas informadas individualmente: 17 anónimas + 39 con sesión de cuentas QA (solo lecturas y envíos que la aplicación debe rechazar), y 2 BLOCKED con motivo (`AUT-002`, `CATE-012`).
- Cada caso corre en su propio proceso de Playwright; el resultado se lee del JSON de Playwright (`passed` → PASS, `skipped` → BLOCKED, cualquier otro → FAIL). Un código de salida 0 sin JSON nunca cuenta como PASS; un HTTP 500 real sigue siendo FAIL.
- La tabla del resumen de Actions incluye la primera línea del error de cada FAIL.
- El reporte HTML combinado se publica como artifact `qa02-reporte-playwright-<n>` (14 días) solo si `scan-report-secrets.mjs` no encuentra contraseñas ni tokens. Los casos con sesión no adjuntan capturas, video, trazas ni snapshot de página.
- No se habilitan operaciones que creen cuentas, pedidos, pagos o alteren inventario en el servidor compartido. El modo `isolated-qa` ejecuta los 58 casos con escrituras permitidas, exclusivamente en una URL HTTPS de QA aislada y restaurable con confirmación explícita.

Este workflow ofrece **un solo clic y un informe integral**, pero **no equivale a 105 pruebas aprobadas** ni a 58 casos verificados formalmente: todos siguen en `draft_requires_ui_verification`. HTTP no cifra credenciales; usar exclusivamente cuentas QA descartables.
